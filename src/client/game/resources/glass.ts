import type { ClientContext } from "@/client/game/context";
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
import { makeGlassMaterial } from "@/gen/client/game/shaders/glass";
import { usingAllAsync } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import { addSharedGlassResources } from "@/shared/game/resources/glass";
import * as Shards from "@/shared/game/shard";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { RegistryLoader } from "@/shared/registry";
import { resolveAsyncObjectKeys } from "@/shared/util/async";
import { Cval } from "@/shared/util/cvals";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { Optional } from "@/shared/util/type_helpers";
import * as THREE from "three";

export interface GlassTextures {
  colorMap: THREE.DataArrayTexture;
  mreaMap: THREE.DataArrayTexture;
  index: THREE.DataTexture;
}

export type GlassMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.RawShaderMaterial
>;

const glassMeshVertexBytes = new Cval({
  path: ["memory", "glassMeshVertexBytes"],
  help: "The total size (in bytes) of the glass mesh vertex arrays.",
  initialValue: 0,
});

const glassMeshIndexBytes = new Cval({
  path: ["memory", "glassMeshIndexBytes"],
  help: "The total size (in bytes) of the glass mesh index arrays.",
  initialValue: 0,
});

const glassMeshCount = new Cval({
  path: ["memory", "glassMeshCount"],
  help: "Counts the number of glass meshes.",
  initialValue: 0,
});

const liveGlassMeshCount = new Cval({
  path: ["memory", "liveGlassMeshCount"],
  help: "Counts the number of meshes that are currently live.",
  initialValue: 0,
});

async function genGlassTextures() {
  const config = await jsonFetch<BlockAtlasData>(
    resolveAssetUrl("atlases/glass")
  );

  const ret: GlassTextures = {
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

async function genGlassMeshHash(
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
    const tensor = deps.get("/terrain/glass/isomorphisms", shardId);
    if (!tensor || tensor.zero()) {
      return;
    }

    const neighborIds = Shards.shardNeighborsWithDiagonals(shardId);
    const shapeHashes = await getDepHashes(
      deps,
      shardId,
      neighborIds,
      "/terrain/glass/isomorphisms"
    );
    const glassHashes = await getDepHashes(
      deps,
      shardId,
      neighborIds,
      "/terrain/glass/tensor"
    );
    const dyeHashes = await getDepHashes(
      deps,
      shardId,
      neighborIds,
      "/terrain/dye"
    );
    const hashes = {
      selfTensors: [
        ...shapeHashes.selfTensors,
        ...glassHashes.selfTensors,
        ...dyeHashes.selfTensors,
      ],
      neighborTensors: [
        ...shapeHashes.neighborTensors,
        ...glassHashes.neighborTensors,
        ...dyeHashes.neighborTensors,
      ],
    };
    hashes.selfTensors.push(
      deps.get("/terrain/moisture", shardId).boundaryHash().volumeHash
    );
    hashes.selfTensors.push(
      deps.get("/terrain/muck", shardId).boundaryHash().volumeHash
    );
    return hashes;
  });
}

async function genGlassMesh(
  { async, voxeloo }: ClientContext,
  deps: ClientResourceDeps,
  shardId: Shards.ShardId
): Promise<Optional<GlassMesh>> {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  // Fetch the flora index.
  const [
    glassIndex,
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
    deps.get("/terrain/glass/index"),
    deps.get("/materials/shaping_material"),
    deps.get("/materials/destroying_material"),
    deps.get("/terrain/shape/index"),
    deps.get("/terrain/glass/tensor", shardId),
    deps.get("/terrain/glass/textures"),
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
    const [
      isomorphismLoader,
      glassLoader,
      dyeLoader,
      skyOcclusionLoader,
      irradianceLoader,
    ] = await resolveAsyncObjectKeys(
      getNeighborShardLoaders(deps, [
        shardId,
        ...Shards.shardNeighborsWithDiagonals(shardId),
      ]),
      "/terrain/glass/isomorphisms",
      "/terrain/glass/tensor",
      "/terrain/dye",
      "/lighting/sky_occlusion",
      "/lighting/irradiance"
    );

    // Fetch the current shard's isomorphism tensor. Short circuit if its empty.
    const isomorphisms = isomorphismLoader(shardId);
    if (!isomorphisms || isomorphisms.zero()) {
      return;
    }

    // Generate the tensor of occlusion masks.
    const occlusions = timeCode("glass:toOcclusionTensor", () => {
      return voxeloo.toGlassOcclusionTensor(
        isomorphisms,
        tensor.cpp,
        dye.cpp,
        shapeIndex,
        shard.box.v0,
        isomorphismLoader,
        (shard) => glassLoader(shard)?.cpp,
        (shard) => dyeLoader(shard)?.cpp
      );
    });

    return usingAllAsync([occlusions], async (occlusions) => {
      if (tensor.zero()) {
        return;
      }

      // Generate the block geometry.
      const geometry = timeCode("glass:toBlockGeometry", () => {
        return voxeloo.toBlockGeometry(
          isomorphisms,
          occlusions,
          shapeIndex,
          shard.box.v0
        );
      });

      // Return to the event loop to avoid frame drops.
      await yieldTask();

      // Get the sample tensor from the dye and moisture tensors
      const glassSamples = timeCode("glass:toBlockSampleTensor", () => {
        return voxeloo.toBlockSampleTensor(
          tensor.cpp,
          dye.cpp,
          muck.cpp,
          moisture.cpp,
          glassIndex
        );
      });

      // Load the material buffer and lighting buffer.
      const mbuf = timeCode("glass:toMaterialBuffer", () => {
        return voxeloo.toBlockMaterialBuffer(
          glassSamples,
          growth.cpp,
          muck.cpp
        );
      });
      const lbuf = timeCode("glass:toBlockLightBuffer", () => {
        return voxeloo.toBlockLightingBuffer(
          tensor.cpp,
          shard.box.v0,
          isomorphismLoader,
          (shard) => skyOcclusionLoader(shard)?.cpp,
          (shard) => irradianceLoader(shard)?.cpp
        );
      });

      // Generate the material buffer texture objects.
      const [materialRank, materialData, lightingRank, lightingData, material] =
        timeCode("glass:generateMaterial", () => {
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
          const material = makeGlassMaterial({
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
        "glass:blockGeometryToBufferGeometry",
        () => new THREE.Mesh(blockGeometryToBufferGeometry(geometry), material)
      );

      mesh.frustumCulled = false;

      // Bump some counters.
      const indexBytes = 4 * geometry.indices.length;
      const vertexBytes = 4 * geometry.vertices.length;
      glassMeshIndexBytes.value += indexBytes;
      glassMeshVertexBytes.value += vertexBytes;
      glassMeshCount.value += 1;
      liveGlassMeshCount.value += 1;

      return makeDisposable(mesh, () => {
        liveGlassMeshCount.value -= 1;

        mesh.geometry.dispose();
        mesh.material.dispose();
        lightingData.dispose();
        lightingRank.dispose();
        materialData.dispose();
        materialRank.dispose();
        lbuf.delete();
        mbuf.delete();
        glassSamples.delete();

        glassMeshVertexBytes.value -= vertexBytes;
        glassMeshIndexBytes.value -= indexBytes;
      });
    });
  });
}

export async function addGlassResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  await addSharedGlassResources(await loader.get("voxeloo"), builder);

  builder.add("/terrain/glass/textures", loader.provide(genGlassTextures));
  builder.addHashChecked(
    "/terrain/glass/mesh",
    loader.provide(genGlassMesh),
    loader.provide(genGlassMeshHash),
    depHashesMatch
  );
}
