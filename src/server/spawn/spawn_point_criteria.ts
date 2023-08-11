import type { TerrainID } from "@/shared/asset_defs/terrain";
import { safeGetTerrainId } from "@/shared/asset_defs/terrain";
import { isDayTime, sunInclination } from "@/shared/game/sun_moon_position";
import type { BiomesId } from "@/shared/ids";
import { distSq } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";

import type { SpawnEvent } from "@/shared/npc/bikkie";
import { idToSpawnEvent } from "@/shared/npc/bikkie";
import type { NpcGlobals } from "@/shared/npc/npc_globals";
import { satisfiesNumericalConstraint } from "@/shared/npc/spawn_events";

export interface SpawnFeatures {
  position: Vec3;
  terrainId: TerrainID;
  skyVisibility: number;
  water: number;
  muck: number;
}

export function findSpawnEventCandidatePoints(
  spawnEvent: SpawnEvent,
  globalParams: NpcGlobals,
  spawnFeatures: Map<TerrainID, SpawnFeatures[]>
): Vec3[] {
  const candidates: Vec3[] = [];

  for (const terrainId of spawnEvent.spawnConstraints.terrainType) {
    const terrainPoints = spawnFeatures.get(safeGetTerrainId(terrainId)!);
    if (!terrainPoints) {
      continue;
    }
    for (const point of terrainPoints) {
      // Look at the point above the ground.
      if (pointIsSpawnCandidate(globalParams, spawnEvent, point)) {
        candidates.push(point.position);
      }
    }
  }

  return candidates;
}

function pointIsSpawnCandidate(
  globalParams: NpcGlobals,
  spawnEvent: SpawnEvent,
  surfacePoint: SpawnFeatures
): boolean {
  if (
    spawnEvent.spawnConstraints.nearPosition &&
    !satisfiesNumericalConstraint(
      spawnEvent.spawnConstraints.nearPosition.distance,
      distSq(
        spawnEvent.spawnConstraints.nearPosition.position,
        surfacePoint.position
      ),
      { constraintTransform: (x) => x ** 2 }
    )
  ) {
    return false;
  }

  if (
    !satisfiesNumericalConstraint(
      spawnEvent.spawnConstraints.depth,
      surfacePoint.position[1]
    )
  ) {
    return false;
  }

  if (
    !satisfiesNumericalConstraint(
      spawnEvent.spawnConstraints.distanceFromSky,
      surfacePoint.skyVisibility
    )
  ) {
    return false;
  }

  if (
    !satisfiesNumericalConstraint(
      spawnEvent.spawnConstraints.muck,
      surfacePoint.muck
    )
  ) {
    return false;
  }

  if (spawnEvent.spawnConstraints.underWater !== undefined) {
    const pointIsUnderWater = surfacePoint.water > 0;
    if (pointIsUnderWater !== spawnEvent.spawnConstraints.underWater) {
      return false;
    }
  }

  return true;
}

// Cheap tests that depend only on the time.
export function canSpawnAtTime(
  spawnEventId: BiomesId,
  secondsSinceEpoch: number
): boolean {
  const spawnEvent = idToSpawnEvent(spawnEventId);

  if (spawnEvent.spawnConstraints.timeOfDay) {
    const dayTime = isDayTime(sunInclination(secondsSinceEpoch));
    switch (spawnEvent.spawnConstraints.timeOfDay) {
      case "day":
        if (!dayTime) {
          return false;
        }
        break;
      case "night":
        if (dayTime) {
          return false;
        }
        break;
    }
  }

  return true;
}

export function findSpawnEventPosition(candidates: Vec3[]): Vec3 | undefined {
  if (candidates.length === 0) {
    return;
  }

  const spawnPointVoxel =
    candidates[Math.floor(Math.random() * candidates.length)];

  // Bump up the spawn point so it's centered in the spawn voxel.
  return [
    spawnPointVoxel[0] + 0.5,
    spawnPointVoxel[1],
    spawnPointVoxel[2] + 0.5,
  ];
}
