import type { BlockMesh } from "@/client/game/resources/blocks";
import type { FloraMesh } from "@/client/game/resources/florae";
import type { WaterMesh } from "@/client/game/resources/water";
import {
  makeScreenFillingAlphaMap,
  updateScreenFillingAlphaMap,
} from "@/client/game/util/screen_quad";

import type { ClientContext } from "@/client/game/context";
import type { GlassMesh } from "@/client/game/resources/glass";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { makeAlphaMap } from "@/client/game/util/textures";
import { makeDisposable } from "@/shared/disposable";
import { addSharedTerrainResources } from "@/shared/game/resources/terrain";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_SHAPE, worldPos } from "@/shared/game/shard";
import { add, boxEdgeVertices, boxVertices, sub } from "@/shared/math/linear";
import type { AABB, Vec2, Vec3 } from "@/shared/math/types";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { RegistryLoader } from "@/shared/registry";
import { Cval } from "@/shared/util/cvals";
import type { Optional } from "@/shared/util/type_helpers";
import type { DynamicBuffer } from "@/shared/wasm/buffers";
import { makeDynamicBuffer } from "@/shared/wasm/buffers";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { Occluder } from "@/shared/wasm/types/culling";
import * as THREE from "three";

export type TerrainShardIds = string[];

function expand([v0, v1]: AABB) {
  const epsilon: Vec3 = [5e-3, 5e-3, 5e-3];
  return [sub(v0, epsilon), add(v1, epsilon)] as AABB;
}

async function genTerrainBoxesMesh(deps: ClientResourceDeps, shardId: ShardId) {
  const boxes = deps.get("/physics/boxes", shardId);
  if (!boxes) {
    return;
  }

  const vertices: number[] = [];
  boxes.scan((aabb) => {
    vertices.push(...boxEdgeVertices(...expand(aabb)));
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return makeDisposable(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xff00ff })
    ),
    () => geometry.dispose()
  );
}

async function genTerrainEditsDebugMesh(
  deps: ClientResourceDeps,
  shardId: ShardId
) {
  const editsBlock = deps.get("/terrain/edits", shardId);
  if (!editsBlock) {
    return;
  }

  const vertices: number[] = [];
  const pos = worldPos(shardId);
  editsBlock.scan((x, y, z, _val) => {
    const aabb: AABB = [add(pos, [x, y, z]), add(pos, [x + 1, y + 1, z + 1])];
    vertices.push(...boxEdgeVertices(...aabb));
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return makeDisposable(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffff00 })
    ),
    () => geometry.dispose()
  );
}

async function genTerrainDanglingOccupancyMesh(
  deps: ClientResourceDeps,
  shardId: ShardId
) {
  const occupancy = deps.get("/terrain/occupancy", shardId);
  const volume = deps.get("/terrain/volume", shardId);
  if (!occupancy) {
    return;
  }

  const vertices: number[] = [];
  const pos = worldPos(shardId);
  for (const [[x, y, z], occupancyId] of occupancy) {
    // If owner is set, but it's an empty voxel, we have a dangling owner.
    if (occupancyId && !volume?.get(x, y, z)) {
      const aabb: AABB = [add(pos, [x, y, z]), add(pos, [x + 1, y + 1, z + 1])];
      vertices.push(...boxEdgeVertices(...aabb));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return makeDisposable(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffff00 })
    ),
    () => geometry.dispose()
  );
}

async function genTerrainPlacerDebugMesh(
  deps: ClientResourceDeps,
  shardId: ShardId
) {
  const placer = deps.get("/terrain/placer", shardId);
  if (!placer) {
    return;
  }

  const vertices: number[] = [];
  const origin = worldPos(shardId);
  for (const [pos, _] of placer) {
    const v0 = add(origin, pos);
    const v1 = add(v0, [1, 1, 1]);
    vertices.push(...boxEdgeVertices(v0, v1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return makeDisposable(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xaa44ff })
    ),
    () => geometry.dispose()
  );
}

export interface OcclusionData {
  aabb: AABB;
  occluder?: Occluder;
}

const terrainOccluderCount = new Cval({
  path: ["memory", "terrainOccluderCount"],
  help: "The total number of occluder boxes.",
  initialValue: 0,
});

async function genTerrainOccluder(
  { async, voxeloo }: ClientContext,
  deps: ClientResourceDeps,
  shardId: ShardId
) {
  const pos = worldPos(shardId);
  return async.runWithPosition(pos, async () => {
    if (deps.get("/terrain/empty", shardId)) {
      return;
    }

    const aabb = [pos, add(pos, SHARD_SHAPE)] as AABB;
    const shapes = deps.get("/terrain/block/isomorphisms", shardId);
    if (shapes) {
      const shapeIndex = deps.get("/terrain/shape/index");
      const occluder = timeCode("terrain:toIsomorphismOccluder", () => {
        return voxeloo.toIsomorphismOccluder(shapeIndex, shapes.cpp, pos);
      });
      terrainOccluderCount.value += occluder.size();
      return makeDisposable({ aabb, occluder }, () => {
        terrainOccluderCount.value -= occluder.size();
        occluder.delete();
      });
    } else {
      return { aabb };
    }
  });
}

async function genTerrainOccluderMesh(
  deps: ClientResourceDeps,
  shardId: ShardId
) {
  const data = await deps.get("/terrain/occluder", shardId);
  if (!data?.occluder) {
    return;
  }

  // Define the vertices.
  const vertices: number[] = [];
  data.occluder.scan((aabb) => {
    vertices.push(...boxVertices(...expand(aabb)));
  });

  // Build and return the occluder as a mesh.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return makeDisposable(
    new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
        opacity: 0.5,
        transparent: true,
      })
    ),
    () => geometry.dispose()
  );
}

export interface OcclusionDebugMesh {
  time: number;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  alphaMap: THREE.DataTexture;
  buffer: DynamicBuffer<"U8">;
  shape: Readonly<Vec2>;
}

export function updateOcclusionMesh(occlusionMesh: OcclusionDebugMesh) {
  const { buffer, shape } = occlusionMesh;
  occlusionMesh.alphaMap.dispose();
  occlusionMesh.alphaMap = makeAlphaMap(buffer.asArray(), ...shape);
  updateScreenFillingAlphaMap(occlusionMesh.mesh, occlusionMesh.alphaMap);
}

function genOcclusionDebugMesh({ voxeloo }: { voxeloo: VoxelooModule }) {
  const shape = [1, 1] as const;
  const buffer = makeDynamicBuffer(voxeloo, "U8", 1);
  const alphaMap = makeAlphaMap(buffer.asArray(), ...shape);
  const ret: OcclusionDebugMesh = {
    time: 0,
    mesh: makeScreenFillingAlphaMap(alphaMap),
    alphaMap,
    buffer,
    shape,
  };
  return makeDisposable(ret, () => {
    ret.mesh.geometry.dispose();
    ret.mesh.material.dispose();
    ret.alphaMap.dispose();
    ret.buffer.delete();
  });
}

function genTerrainShardMesh(deps: ClientResourceDeps, shardId: ShardId) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  const vertices = boxEdgeVertices(...expand([shard.box.v0, shard.box.v1]));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return makeDisposable(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x00ffff })
    ),
    () => geometry.dispose()
  );
}

export type CombinedMesh = [
  Optional<BlockMesh>,
  Optional<GlassMesh>,
  Optional<FloraMesh>,
  Optional<WaterMesh>
];

async function genTerrainCombinedMesh(
  deps: ClientResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  const ret = await Promise.all([
    deps.get("/terrain/block/mesh", shardId),
    deps.get("/terrain/glass/mesh", shardId),
    deps.get("/terrain/flora/mesh", shardId),
    deps.get("/water/mesh", shardId),
  ]);
  return ret as CombinedMesh;
}

export async function addTerrainResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  addSharedTerrainResources(await loader.get("voxeloo"), builder);
  builder.add("/terrain/boxes_mesh", genTerrainBoxesMesh);
  builder.add("/terrain/occluder", loader.provide(genTerrainOccluder));
  builder.add("/terrain/occluder_mesh", genTerrainOccluderMesh);
  builder.add(
    "/terrain/occlusion_debug_mesh",
    loader.provide(genOcclusionDebugMesh)
  );
  builder.add("/terrain/shard_mesh", genTerrainShardMesh);
  builder.add("/terrain/combined_mesh", genTerrainCombinedMesh);
  builder.add("/terrain/edits_debug_mesh", genTerrainEditsDebugMesh);
  builder.add("/terrain/placer_debug_mesh", genTerrainPlacerDebugMesh);
  builder.add(
    "/terrain/dangling_occupancy_mesh",
    genTerrainDanglingOccupancyMesh
  );
}
