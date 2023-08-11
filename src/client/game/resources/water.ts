import type { ClientContext } from "@/client/game/context";
import { DepthPeeledMesh } from "@/client/game/renderers/three_ext/depth_peeled_mesh";
import { createShardLoader } from "@/client/game/resources/shards";
import { getNeighborShardLoaders } from "@/client/game/resources/terrain_meshes";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { blockGeometryToBufferGeometry } from "@/client/game/util/meshes";
import { makeBufferTexture } from "@/client/game/util/textures";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { makeWaterMaterial } from "@/gen/client/game/shaders/water";
import { using } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import { addSharedWaterResources } from "@/shared/game/resources/water";
import * as Shards from "@/shared/game/shard";
import { add, boxEdgeVertices, sub } from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { RegistryLoader } from "@/shared/registry";
import { resolveAsyncObjectKeys } from "@/shared/util/async";
import { Cval } from "@/shared/util/cvals";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import * as THREE from "three";

export type WaterMesh = DepthPeeledMesh;

export interface WaterTexture {
  normalMap: THREE.Texture;
  distortionMap: THREE.Texture;
}

const waterMeshVertexBytes = new Cval({
  path: ["memory", "waterMeshVertexBytes"],
  help: "The total size (in bytes) of the water mesh vertex arrays.",
  initialValue: 0,
});

const waterMeshIndexBytes = new Cval({
  path: ["memory", "waterMeshIndexBytes"],
  help: "The total size (in bytes) of the water mesh index arrays.",
  initialValue: 0,
});

const waterMeshLightingBufferBytes = new Cval({
  path: ["memory", "waterMeshLightingBufferBytes"],
  help: "The total size (in bytes) of the water mesh lighting buffers.",
  initialValue: 0,
});

const waterMeshCount = new Cval({
  path: ["memory", "waterMeshCount"],
  help: "Counts the number of meshes.",
  initialValue: 0,
});

function genWaterTexture(): WaterTexture {
  const normalMap = (() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(resolveAssetUrl("textures/water_normals"));
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  })();

  const distortionMap = (() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(resolveAssetUrl("textures/water_distortion"));
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  })();

  return makeDisposable(
    {
      normalMap: normalMap,
      distortionMap: distortionMap,
    },
    () => {
      distortionMap.dispose();
      normalMap.dispose();
    }
  );
}

async function genWaterMesh(
  { async, voxeloo }: ClientContext,
  deps: ClientResourceDeps,
  shardId: Shards.ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  // Work out the shard center for async task prioritization.
  const center = Shards.shardCenter(shardId);

  return async.runWithPosition(center, async (yieldTask) => {
    // Fetch the water tensor.
    const [tensor, { normalMap, distortionMap }, muck] = await Promise.all([
      deps.get("/water/tensor", shardId),
      deps.get("/water/texture"),
      deps.get("/terrain/muck", shardId),
    ]);
    if (!tensor || tensor.zero()) {
      return;
    }

    // Create loaders for the required neighborhood of terrain tensors.
    const ids = [shardId, ...Shards.shardNeighborsWithDiagonals(shardId)];
    const [isomorphismLoader, skyOcclusionLoader, irradianceLoader] =
      await resolveAsyncObjectKeys(
        getNeighborShardLoaders(deps, ids),
        "/terrain/isomorphisms/dense",
        "/lighting/sky_occlusion",
        "/lighting/irradiance"
      );
    const waterLoader = await createShardLoader(deps, "/water/tensor", ids);

    // Build the water surface tensor.
    const surfaceTensor = timeCode("water:toWaterSurface", () => {
      return voxeloo.toWaterSurface(
        tensor.cpp,
        shard.box.v0,
        (shard) => waterLoader(shard)?.cpp
      );
    });

    // Build geometry from the water tensor.
    const geometry = timeCode("water:toWaterGeometry", () => {
      return voxeloo.toWaterGeometry(
        surfaceTensor,
        (shard) => isomorphismLoader(shard)?.cpp,
        (shard) => waterLoader(shard)?.cpp,
        shard.box.v0
      );
    });

    await yieldTask();

    // Build the light buffer for the flora tensor.
    const lightBuffer = timeCode("water:toLightBuffer", () => {
      return voxeloo.toWaterLightingBuffer(
        surfaceTensor,
        shard.box.v0,
        (shard) => isomorphismLoader(shard)?.cpp,
        (shard) => skyOcclusionLoader(shard)?.cpp,
        (shard) => irradianceLoader(shard)?.cpp
      );
    });

    // Build the muck buffer
    const matBuffer = timeCode("water:toMuckBuffer", () => {
      return voxeloo.toWaterMaterialBuffer(tensor.cpp, muck.cpp);
    });

    // Generate the lighting buffer texture objects.
    const lightingRank = makeBufferTexture(
      lightBuffer.rankView(),
      ...lightBuffer.rankShape()
    );
    const lightingData = makeBufferTexture(
      lightBuffer.dataView(),
      ...lightBuffer.dataShape()
    );

    const materialRank = makeBufferTexture(
      matBuffer.rankView(),
      ...matBuffer.rankShape()
    );
    const materialData = makeBufferTexture(
      matBuffer.dataView(),
      ...matBuffer.dataShape()
    );

    // Update the material to reflect the new position.
    const material = makeWaterMaterial({
      baseDepth: new THREE.Texture(),
      distortionMap,
      normalMap,
      lightingData,
      lightingRank,
      origin: geometry.origin,
      materialData,
      materialRank,
    });
    material.side = THREE.DoubleSide;
    material.transparent = true;
    material.depthWrite = false;

    // Build the final mesh.
    const mesh = new DepthPeeledMesh(
      blockGeometryToBufferGeometry(geometry),
      material
    );
    mesh.frustumCulled = false;
    mesh.depthMesh.frustumCulled = false;

    // Bump some counters.
    const indexBytes = 4 * geometry.indices.length;
    const vertexBytes = 4 * geometry.vertices.length;
    const lightingBufferBytes = 4 * lightBuffer.dataView().length;
    waterMeshIndexBytes.value += indexBytes;
    waterMeshVertexBytes.value += vertexBytes;
    waterMeshLightingBufferBytes.value += lightingBufferBytes;
    waterMeshCount.value += 1;

    return makeDisposable(mesh, () => {
      mesh.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
      lightingRank.dispose();
      lightingData.dispose();
      materialRank.dispose();
      materialData.dispose();
      lightBuffer.delete();
      surfaceTensor.delete();

      waterMeshCount.value -= 1;
      waterMeshLightingBufferBytes.value -= lightingBufferBytes;
      waterMeshVertexBytes.value -= vertexBytes;
      waterMeshIndexBytes.value -= indexBytes;
    });
  });
}

function contract([v0, v1]: AABB) {
  const epsilon: Vec3 = [5e-3, 5e-3, 5e-3];
  return [add(v0, epsilon), sub(v1, epsilon)] as AABB;
}

async function genWaterDebugMesh(
  { voxeloo }: { voxeloo: VoxelooModule },
  deps: ClientResourceDeps,
  shardId: Shards.ShardId
) {
  const tensor = deps.get("/water/tensor", shardId);
  if (!tensor) {
    return;
  }

  return using(Tensor.make(voxeloo, Shards.SHARD_SHAPE, "U8"), (sources) => {
    // Extract a tensor of all non-source water voxels.
    const writer = new TensorUpdate(sources);
    for (const [pos, val] of tensor) {
      if (val === 15 /* WATER_SOURCE_LEVEL */) {
        writer.set(pos, 1);
      }
    }
    writer.apply();

    // Generate an AABB structure from the water tensor.
    return using(
      voxeloo.toWaterBoxDict(sources.cpp, Shards.worldPos(shardId)),
      (boxes) => {
        const vertices: number[] = [];
        boxes.scan((aabb) => {
          vertices.push(...boxEdgeVertices(...contract(aabb)));
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(vertices), 3)
        );

        return makeDisposable(
          new THREE.LineSegments(
            geometry,
            new THREE.LineBasicMaterial({ color: 0x999900 })
          ),
          () => geometry.dispose()
        );
      }
    );
  });
}

export async function addWaterResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  addSharedWaterResources(await loader.get("voxeloo"), builder);
  builder.add("/water/mesh", loader.provide(genWaterMesh));
  builder.add("/water/texture", genWaterTexture);
  builder.add("/water/debug", loader.provide(genWaterDebugMesh));
}
