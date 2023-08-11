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
import { floraGeometryToBufferGeometry } from "@/client/game/util/meshes";
import {
  makeBufferTexture,
  makeColorMapArray,
} from "@/client/game/util/textures";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import type { FloraAtlasData } from "@/galois/interface/types/data";
import { makeFloraMaterial } from "@/gen/client/game/shaders/flora";
import { makeDisposable } from "@/shared/disposable";
import { addSharedFloraResources } from "@/shared/game/resources/florae";
import * as Shards from "@/shared/game/shard";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { RegistryLoader } from "@/shared/registry";
import { resolveAsyncObjectKeys } from "@/shared/util/async";
import { Cval } from "@/shared/util/cvals";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { Optional } from "@/shared/util/type_helpers";
import * as THREE from "three";

export type FloraColors = THREE.DataArrayTexture;
export type FloraMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.RawShaderMaterial
>;

const floraMeshVertexBytes = new Cval({
  path: ["memory", "floraMeshVertexBytes"],
  help: "The total size (in bytes) of the flora mesh vertex arrays.",
  initialValue: 0,
});

const floraMeshIndexBytes = new Cval({
  path: ["memory", "floraMeshIndexBytes"],
  help: "The total size (in bytes) of the flora mesh index arrays.",
  initialValue: 0,
});

async function genFloraColors() {
  const config = await jsonFetch<FloraAtlasData>(
    resolveAssetUrl("atlases/florae")
  );

  const colorMap = makeColorMapArray(
    new Uint8Array(Buffer.from(config.colors.data, "base64").buffer),
    ...config.colors.shape
  );
  return makeDisposable(colorMap, () => {
    colorMap.dispose();
  });
}

async function genFloraMeshHash(
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
    const tensor = deps.get("/terrain/flora/tensor", shardId);
    if (!tensor || tensor.zero()) {
      return;
    }

    const neighborIds = Shards.shardNeighborsWithDiagonals(shardId);

    const hashes = await getDepHashes(
      deps,
      shardId,
      neighborIds,
      "/terrain/flora/tensor"
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

async function genFloraMesh(
  { async, voxeloo }: ClientContext,
  deps: ClientResourceDeps,
  shardId: Shards.ShardId
): Promise<Optional<FloraMesh>> {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  // Fetch the flora index.
  const [index, colorMap, tensor, growth, muck] = await Promise.all([
    deps.get("/terrain/flora/index"),
    deps.get("/terrain/flora/colors"),
    deps.get("/terrain/flora/tensor", shardId),
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

    // Build geometry from the flora tensor.
    const geometry = timeCode("florae:toFloraGeometry", () => {
      return voxeloo.toFloraGeometry(
        tensor.cpp,
        growth.cpp,
        muck.cpp,
        index,
        shard.box.v0
      );
    });

    // Return to the event loop to avoid frame drops.
    await yieldTask();

    // Build the light buffer for the flora tensor.
    const lightBuffer = timeCode("florae:toLightBuffer", () => {
      return voxeloo.toFloraLightingBuffer(
        tensor.cpp,
        shard.box.v0,
        (shard) => isomorphismLoader(shard)?.cpp,
        (shard) => skyOcclusionLoader(shard)?.cpp,
        (shard) => irradianceLoader(shard)?.cpp
      );
    });

    const materialBuffer = timeCode("florae:toMaterialBuffer", () => {
      return voxeloo.toFloraMaterialBuffer(
        tensor.cpp,
        growth.cpp,
        muck.cpp,
        index
      );
    });

    // Generate dynamic buffer texture objects.
    const lightingData = makeBufferTexture(
      lightBuffer.dataView(),
      ...lightBuffer.dataShape()
    );
    const materialData = makeBufferTexture(
      materialBuffer.dataView(),
      ...materialBuffer.dataShape()
    );

    // Update the material to reflect the new position.
    const material = makeFloraMaterial({
      colorMap,
      materialData,
      lightingData,
      origin: geometry.origin,
    });
    material.side = THREE.DoubleSide;

    // Build the final mesh.
    const mesh = new THREE.Mesh(
      floraGeometryToBufferGeometry(geometry),
      material
    );
    mesh.frustumCulled = false;

    // Bump some counters.
    const indexBytes = 4 * geometry.indices.length;
    const vertexBytes = 4 * geometry.vertices.length;
    floraMeshIndexBytes.value += indexBytes;
    floraMeshVertexBytes.value += vertexBytes;

    return makeDisposable(mesh, () => {
      mesh.geometry.dispose();
      mesh.material.dispose();
      lightingData.dispose();
      lightBuffer.delete();

      floraMeshVertexBytes.value -= vertexBytes;
      floraMeshIndexBytes.value -= indexBytes;
    });
  });
}

export async function addFloraResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  await addSharedFloraResources(await loader.get("voxeloo"), builder);

  builder.add("/terrain/flora/colors", genFloraColors);
  builder.addHashChecked(
    "/terrain/flora/mesh",
    loader.provide(genFloraMesh),
    loader.provide(genFloraMeshHash),
    depHashesMatch
  );
}
