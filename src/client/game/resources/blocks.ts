import type { ClientContext } from "@/client/game/context";
import { DepthPeeledMesh } from "@/client/game/renderers/three_ext/depth_peeled_mesh";
import type { DepHashes } from "@/client/game/resources/terrain_meshes";
import {
  depHashesMatch,
  getDepHashes,
  getNeighborShardLoaders,
  uniqueDepHash,
} from "@/client/game/resources/terrain_meshes";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { blockGeometryToBufferGeometry } from "@/client/game/util/meshes";
import {
  makeBufferTexture,
  makeBufferTextureFromBase64,
  makeColorMapArray,
} from "@/client/game/util/textures";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import type { BlockAtlasData } from "@/galois/interface/types/data";
import { makeBlocksMaterial } from "@/gen/client/game/shaders/blocks";
import { usingAllAsync } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import { addSharedBlockResources } from "@/shared/game/resources/blocks";
import { addSharedIsomorphismResources } from "@/shared/game/resources/isomorphisms";
import * as Shards from "@/shared/game/shard";
import { timeAsyncCode, timeCode } from "@/shared/metrics/performance_timing";
import type { RegistryLoader } from "@/shared/registry";
import { resolveAsyncObjectKeys } from "@/shared/util/async";
import { Cval } from "@/shared/util/cvals";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { Optional } from "@/shared/util/type_helpers";
import { Tensor } from "@/shared/wasm/tensors";
import type * as THREE from "three";

export interface BlockTextures {
  colorMap: THREE.DataArrayTexture;
  mreaMap: THREE.DataArrayTexture;
  index: THREE.DataTexture;
}

export type BlockMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.RawShaderMaterial
>;

const blockMeshVertexBytes = new Cval({
  path: ["memory", "blockMeshVertexBytes"],
  help: "The total size (in bytes) of the block mesh vertex arrays.",
  initialValue: 0,
});

const blockMeshIndexBytes = new Cval({
  path: ["memory", "blockMeshIndexBytes"],
  help: "The total size (in bytes) of the block mesh index arrays.",
  initialValue: 0,
});

const blockMeshLightingBufferBytes = new Cval({
  path: ["memory", "blockMeshLightingBufferBytes"],
  help: "The total size (in bytes) of the block mesh lighting buffers.",
  initialValue: 0,
});

const blockMeshMaterialBufferBytes = new Cval({
  path: ["memory", "blockMeshMaterialBufferBytes"],
  help: "The total size (in bytes) of the block mesh material buffers.",
  initialValue: 0,
});

const blockMeshCount = new Cval({
  path: ["memory", "blockMeshCount"],
  help: "Counts the number of meshes.",
  initialValue: 0,
});

const liveBlockMeshCount = new Cval({
  path: ["memory", "liveBlockMeshCount"],
  help: "Counts the number of meshes that are currently live.",
  initialValue: 0,
});

const blockMeshEmptySurfaceCount = new Cval({
  path: ["memory", "blockMeshEmptySurfaceCount"],
  help: "Counts the number of meshes with empty surfaces.",
  initialValue: 0,
});

async function genBlockTextures() {
  const config = await jsonFetch<BlockAtlasData>(
    resolveAssetUrl("atlases/blocks")
  );

  const ret: BlockTextures = {
    colorMap: makeColorMapArray(
      new Uint8Array(Buffer.from(config.colors.data, "base64").buffer),
      ...config.colors.shape
    ),
    mreaMap: makeColorMapArray(
      new Uint8Array(Buffer.from(config.mrea.data, "base64").buffer),
      ...config.mrea.shape,
      false
    ),
    index: makeBufferTextureFromBase64(
      config.index.data,
      ...config.index.shape
    ),
  };
  return makeDisposable(ret, () => {
    ret.index.dispose();
    ret.colorMap.dispose();
    ret.mreaMap.dispose();
  });
}

async function genBlockMeshHash(
  { async }: ClientContext,
  deps: ClientResourceDeps,
  shardId: Shards.ShardId
): Promise<DepHashes | undefined> {
  const tweaks = deps.get("/tweaks");
  if (!tweaks.building.terrainMeshShortCircuiting) {
    return uniqueDepHash();
  }

  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  return async.runWithPosition(Shards.shardCenter(shardId), async () => {
    const tensor = deps.get("/terrain/block/isomorphisms", shardId);
    if (!tensor || tensor.zero()) {
      blockMeshEmptySurfaceCount.value += 1;
      return;
    }

    const neighborIds = Shards.shardNeighborsWithDiagonals(shardId);
    const hashes = await getDepHashes(
      deps,
      shardId,
      neighborIds,
      "/terrain/block/isomorphisms"
    );
    // Also add a hash for our current block tensor, for block swaps
    const blockTensor = deps.get("/terrain/block/tensor", shardId);
    const blockHash = blockTensor?.boundaryHash();
    if (blockHash) {
      hashes.selfTensors.push(blockHash.volumeHash);
    }

    hashes.selfTensors.push(
      deps.get("/terrain/dye", shardId).boundaryHash().volumeHash
    );
    hashes.selfTensors.push(
      deps.get("/terrain/moisture", shardId).boundaryHash().volumeHash
    );
    hashes.selfTensors.push(
      deps.get("/terrain/growth", shardId).boundaryHash().volumeHash
    );
    hashes.selfTensors.push(
      deps.get("/terrain/muck", shardId).boundaryHash().volumeHash
    );
    return hashes;
  });
}

async function genBlockMesh(
  { async, voxeloo, worker }: ClientContext,
  deps: ClientResourceDeps,
  shardId: Shards.ShardId
): Promise<Optional<BlockMesh>> {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  // Fetch the flora index.
  const [
    blockIndex,
    shapingMaterial,
    destroyingMaterial,
    shapeIndex,
    tensor,
    textures,
    dye,
    moisture,
    growth,
    muck,
  ] = await Promise.all([
    deps.get("/terrain/block/index"),
    deps.get("/materials/shaping_material"),
    deps.get("/materials/destroying_material"),
    deps.get("/terrain/shape/index"),
    deps.get("/terrain/block/tensor", shardId),
    deps.get("/terrain/block/textures"),
    deps.get("/terrain/dye", shardId),
    deps.get("/terrain/moisture", shardId),
    deps.get("/terrain/growth", shardId),
    deps.get("/terrain/muck", shardId),
  ]);
  if (!tensor || tensor.zero()) {
    return;
  }

  // Work out the shard center for async task prioritization.
  const center = Shards.shardCenter(shardId);

  return async.runWithPosition(center, async (yieldTask) => {
    // Create loaders for the required neighborhood of terrain tensors.
    const [isomorphismLoader, skyOcclusionLoader, irradianceLoader] =
      await resolveAsyncObjectKeys(
        getNeighborShardLoaders(deps, [
          shardId,
          ...Shards.shardNeighborsWithDiagonals(shardId),
        ]),
        "/terrain/block/isomorphisms",
        "/lighting/sky_occlusion",
        "/lighting/irradiance"
      );

    // Fetch the current shard's isomorphism tensor. Short circuit if its empty.
    const isomorphisms = isomorphismLoader(shardId);
    if (!isomorphisms || isomorphisms.zero()) {
      blockMeshEmptySurfaceCount.value += 1;
      return;
    }

    // Generate the tensor of occlusion masks.
    const occlusions = timeCode("blocks:toOcclusionTensor", () => {
      return new Tensor(
        voxeloo,
        voxeloo.toOcclusionTensor(
          isomorphisms.cpp,
          shapeIndex,
          shard.box.v0,
          (shard) => isomorphismLoader(shard)?.cpp
        )
      );
    });

    // Generate the tensor of surface blocks.
    const surface = timeCode("blocks:toSurfaceTensor", () =>
      voxeloo.toSurfaceTensor(tensor.cpp, occlusions.cpp)
    );

    return usingAllAsync([occlusions, surface], async (occlusions, surface) => {
      if (surface.zero()) {
        blockMeshEmptySurfaceCount.value += 1;
        return;
      }

      // Generate the block geometry.
      const geometry = await timeAsyncCode(
        "blocks:toBlockGeometry",
        async () => {
          if (worker) {
            return (
              await worker.genBlockMesh({
                encodedIsomorpisms: isomorphisms.save(),
                encodedOcclusions: occlusions.save(),
                v0: shard.box.v0,
              })
            ).geometry;
          } else {
            return voxeloo.toBlockGeometry(
              isomorphisms.cpp,
              occlusions.cpp,
              shapeIndex,
              shard.box.v0
            );
          }
        }
      );

      // Return to the event loop to avoid frame drops.
      await yieldTask();

      // Get the block sample tensor from the dye and moisture tensors
      const blockSamples = timeCode("blocks:toBlockSampleTensor", () => {
        return voxeloo.toBlockSampleTensor(
          surface,
          dye.cpp,
          muck.cpp,
          moisture.cpp,
          blockIndex
        );
      });

      // Load the material buffer and lighting buffer.
      const mbuf = timeCode("blocks:toMaterialBuffer", () => {
        return voxeloo.toBlockMaterialBuffer(
          blockSamples,
          growth.cpp,
          muck.cpp
        );
      });
      const lbuf = timeCode("blocks:toBlockLightBuffer", () => {
        return voxeloo.toBlockLightingBuffer(
          surface,
          shard.box.v0,
          (shard) => isomorphismLoader(shard)?.cpp,
          (shard) => skyOcclusionLoader(shard)?.cpp,
          (shard) => irradianceLoader(shard)?.cpp
        );
      });

      // Generate the material buffer texture objects.
      const [materialRank, materialData, lightingRank, lightingData, material] =
        timeCode("blocks:generateMaterial", () => {
          const materialRank = makeBufferTexture(
            mbuf.rankView(),
            ...mbuf.rankShape()
          );
          const materialData = makeBufferTexture(
            mbuf.dataView(),
            ...mbuf.dataShape()
          );

          // Generate the lighting buffer texture objects.
          const lightingRank = makeBufferTexture(
            lbuf.rankView(),
            ...lbuf.rankShape()
          );
          const lightingData = makeBufferTexture(
            lbuf.dataView(),
            ...lbuf.dataShape()
          );

          // Update the material to reflect the new position.
          const material = makeBlocksMaterial({
            colorMap: textures.colorMap,
            mreaMap: textures.mreaMap,
            lightingData,
            lightingRank,
            materialData,
            materialRank,
            textureIndex: textures.index,
            origin: geometry.origin,
            destroyTexture: destroyingMaterial.texture,
            shapeTexture: shapingMaterial.texture,
          });
          return [
            materialRank,
            materialData,
            lightingRank,
            lightingData,
            material,
          ];
        });

      // Build the final mesh.
      const mesh = timeCode(
        "blocks:blockGeometryToBufferGeometry",
        () =>
          new DepthPeeledMesh(
            blockGeometryToBufferGeometry(geometry),
            material,
            true
          )
      );

      // Bump some counters.
      const indexBytes = 4 * geometry.indices.length;
      const vertexBytes = 4 * geometry.vertices.length;
      const materialBufferBytes = 4 * mbuf.dataView().length;
      const lightingBufferBytes = 4 * lbuf.dataView().length;
      blockMeshIndexBytes.value += indexBytes;
      blockMeshVertexBytes.value += vertexBytes;
      blockMeshMaterialBufferBytes.value += materialBufferBytes;
      blockMeshLightingBufferBytes.value += lightingBufferBytes;
      blockMeshCount.value += 1;
      liveBlockMeshCount.value += 1;

      return makeDisposable(mesh, () => {
        liveBlockMeshCount.value -= 1;

        mesh.geometry.dispose();
        mesh.material.dispose();
        lightingData.dispose();
        lightingRank.dispose();
        materialData.dispose();
        materialRank.dispose();
        lbuf.delete();
        mbuf.delete();
        blockSamples.delete();

        blockMeshLightingBufferBytes.value -= lightingBufferBytes;
        blockMeshMaterialBufferBytes.value -= materialBufferBytes;
        blockMeshVertexBytes.value -= vertexBytes;
        blockMeshIndexBytes.value -= indexBytes;
      });
    });
  });
}

export async function addBlockResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  const voxeloo = await loader.get("voxeloo");
  await addSharedIsomorphismResources(voxeloo, builder);
  await addSharedBlockResources(voxeloo, builder);

  builder.add("/terrain/block/textures", loader.provide(genBlockTextures));
  builder.addHashChecked(
    "/terrain/block/mesh",
    loader.provide(genBlockMesh),
    loader.provide(genBlockMeshHash),
    depHashesMatch,
    {
      labeledCapacities: {
        blockMeshes: (p) => p.then((m) => (m ? 1 : 0)),
      },
    }
  );
}
