import type { SpawnFeatures } from "@/server/spawn/spawn_point_criteria";
import { findSpawnEventCandidatePoints } from "@/server/spawn/spawn_point_criteria";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { using } from "@/shared/deletable";
import type { ShardId } from "@/shared/ecs/gen/types";
import type { LightingResourcePaths } from "@/shared/game/resources/light";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import { addSharedTerrainResources } from "@/shared/game/resources/terrain";
import { shardDecode, shardToVoxelPos } from "@/shared/game/shard";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import { add } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { idToSpawnEvent, npcGlobals } from "@/shared/npc/bikkie";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type { TypedResourceDeps } from "@/shared/resources/types";
import { DefaultMap } from "@/shared/util/collections";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SurfacePoint } from "@/shared/wasm/types/anima";

interface SpawnOnlyTerrainResourcePaths {
  // Spawn features at all surface points that are potentially interesting to
  // all spawn events.
  "/terrain/spawn_features": PathDef<
    [ShardId],
    DefaultMap<TerrainID, SpawnFeatures[]>
  >;
  "/terrain/surfaces": PathDef<[ShardId], SurfacePoint[]>;
  "/terrain/candidate_spawn_points": PathDef<[ShardId, BiomesId], Vec3[]>;
}

export type SpawnTerrainResourcePaths = TerrainResourcePaths &
  SpawnOnlyTerrainResourcePaths &
  LightingResourcePaths;
export type SpawnTerrainResourceDeps =
  TypedResourceDeps<SpawnTerrainResourcePaths>;

type SpawnTerrainResourcesBuilder =
  BiomesResourcesBuilder<SpawnTerrainResourcePaths>;

function genTerrainSurfaces(
  voxeloo: VoxelooModule,
  deps: SpawnTerrainResourceDeps,
  shardId: ShardId
): SurfacePoint[] {
  const tensor = deps.get("/terrain/tensor", shardId);
  if (!tensor) {
    return [];
  }

  return using(voxeloo.findSurfaces(tensor.cpp), (surfacePoints) =>
    Array.from(Array(surfacePoints.size()).keys(), (i) => surfacePoints.get(i))
  );
}

function genSpawnFeatures(
  voxeloo: VoxelooModule,
  deps: SpawnTerrainResourceDeps,
  shardId: ShardId
) {
  // TODO: Move the isomorphism tensor to shared.
  const terrainHelper = new TerrainHelper(
    voxeloo,
    (id: ShardId) => deps.get("/terrain/volume", id),
    (id: ShardId) => deps.get("/terrain/tensor", id),
    () => undefined,
    (id: ShardId) => deps.get("/lighting/irradiance", id),
    (id: ShardId) => deps.get("/lighting/sky_occlusion", id),
    (id: ShardId) => deps.get("/terrain/muck", id),
    (id: ShardId) => deps.get("/water/tensor", id),
    (id: ShardId) => deps.get("/terrain/dye", id),
    (id: ShardId) => deps.get("/terrain/moisture", id),
    () => undefined,
    () => undefined
  );

  const shardPos = shardDecode(shardId);
  const shardWorldPos = shardToVoxelPos(...shardPos);
  const spawnFeaturesByTerrain = new DefaultMap<TerrainID, SpawnFeatures[]>(
    () => []
  );

  const surfacePoints = deps.get("/terrain/surfaces", shardId);
  for (const p of surfacePoints) {
    const aboveGroundPosition: Vec3 = add([0, 1, 0], p.position);
    const position = add(shardWorldPos, aboveGroundPosition);

    const points = spawnFeaturesByTerrain.get(p.terrainId);
    points.push({
      position,
      terrainId: p.terrainId,
      skyVisibility: terrainHelper.getSkyOcclusion(position),
      water: terrainHelper.getWater(position),
      muck: terrainHelper.getMuck(position),
    });
  }

  return spawnFeaturesByTerrain;
}

function genCandidateSpawnPoints(
  deps: SpawnTerrainResourceDeps,
  shardId: ShardId,
  spawnEventId: BiomesId
) {
  const spawnFeatures = deps.get("/terrain/spawn_features", shardId);

  return findSpawnEventCandidatePoints(
    idToSpawnEvent(spawnEventId),
    npcGlobals(),
    spawnFeatures
  );
}

export function addSpawnTerrainResources(
  voxeloo: VoxelooModule,
  builder: SpawnTerrainResourcesBuilder
) {
  addSharedTerrainResources(voxeloo, builder);

  builder.add("/terrain/candidate_spawn_points", genCandidateSpawnPoints);
  builder.add("/terrain/spawn_features", (deps, shard) =>
    genSpawnFeatures(voxeloo, deps, shard)
  );
  builder.add("/terrain/surfaces", (deps, shard) =>
    genTerrainSurfaces(voxeloo, deps, shard)
  );
}
