import type { Isomorphism } from "@/shared/asset_defs/shapes";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { CollideableSelector } from "@/shared/ecs/gen/selectors";
import type { Table } from "@/shared/ecs/table";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import type { BiomesId } from "@/shared/ids";
import type { RayIntersection } from "@/shared/math/linear";
import { add, intersectRayAabb, scale } from "@/shared/math/linear";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { Dir } from "@/shared/wasm/types/common";
import type { Camera } from "three";
import { Vector3 } from "three";

export type RequiredItem =
  | {
      kind: "terrain";
      position: ReadonlyVec3;
      terrainId: TerrainID;
      isomorphism?: Isomorphism;
      blueprintId: BiomesId;
    }
  | {
      kind: "entity";
      position: ReadonlyVec3;
      entity: ReadonlyEntity;
    };

export interface BlockTerrainSample {
  terrainId: number;
  muck: number;
  dye: number;
  moisture: number;
}

export type TerrainHit = {
  kind: "terrain";
  pos: ReadonlyVec3;
  distance: number;

  terrainId: TerrainID;
  terrainSample: BlockTerrainSample;
  face: Dir;

  // If group at position.
  groupId?: BiomesId;
};

export type EntityHit = {
  kind: "entity";
  pos: ReadonlyVec3;
  distance: number;

  entity: ReadonlyEntity;
};

export type BlueprintHit = {
  kind: "blueprint";
  pos: ReadonlyVec3;
  distance: number;

  // Item required at position by the blueprint.
  blueprintEntityId: BiomesId;
  requiredItem: RequiredItem;

  // If existing terrain at position.
  terrainId?: TerrainID;
  face?: Dir;
};

export type Hit = TerrainHit | EntityHit | BlueprintHit;

export function hitExistingTerrain(
  hit?: Hit
): hit is TerrainHit | Required<BlueprintHit> {
  return (
    hit?.kind === "terrain" ||
    (hit?.kind === "blueprint" && hit.terrainId !== undefined)
  );
}

function createSpatialIndexConfig() {
  return {
    ...CollideableSelector.createIndexFor.spatial(),
  };
}
export type SpatialMetaIndex = ReturnType<typeof createSpatialIndexConfig>;
export type SpatialTable = Table<SpatialMetaIndex>;

export type TraceRayParams = {
  maxDistance: number;
  entityFilter?: (entity: ReadonlyEntity) => boolean;
};

// Results are returned in *descending* order of distance from `from`.
export function traceEntities(
  table: SpatialTable,
  from: ReadonlyVec3,
  dir: ReadonlyVec3,
  params: TraceRayParams
): EntityHit[] {
  const entityHits: EntityHit[] = [];

  // Gather all entities in range of the ray. We center the query on the middle
  // of the ray, to avoid unnecessarily checking behind the ray.
  const halfDistance = params.maxDistance * 0.5;
  const rayMidpoint = add(from, scale(halfDistance, dir));
  for (const entity of table.scan(
    CollideableSelector.query.spatial.inSphere({
      center: rayMidpoint,
      radius: halfDistance,
    })
  )) {
    if (params.entityFilter && !params.entityFilter(entity)) {
      continue;
    }
    const maybeHit = intersectRayEntity(from, dir, entity);
    if (maybeHit && maybeHit.distance <= params.maxDistance) {
      entityHits.push({
        kind: "entity",
        entity,
        distance: maybeHit.distance,
        pos: maybeHit.pos,
      });
    }
  }

  // Sort the results in *descending* order, so it's easy to pop results off
  // from the back in nearest order first.
  entityHits.sort((a, b) => b.distance - a.distance);

  return entityHits;
}

// If the ray intersects the entity, return the point of intersection, otherwise
// return undefined.
function intersectRayEntity(
  from: ReadonlyVec3,
  dir: ReadonlyVec3,
  entity: ReadonlyEntity
): RayIntersection | undefined {
  const entityAabb = getAabbForEntity(entity);
  if (!entityAabb) {
    return undefined;
  }

  return intersectRayAabb(from, dir, entityAabb);
}

// Returns direction facing the camera.
export function getCameraDirection(camera: Camera): Dir {
  const dir = camera.getWorldDirection(new Vector3());
  if (Math.abs(dir.x) > Math.abs(dir.z)) {
    // x-axis is dominant
    return dir.x > 0 ? Dir.X_NEG : Dir.X_POS;
  } else {
    // z-axis is dominant
    return dir.z > 0 ? Dir.Z_NEG : Dir.Z_POS;
  }
}

// Returns the relative voxel position of a set for the given intersection.
export function setPosition(intersection: ReadonlyVec3, face: Dir): Vec3 {
  const [x, y, z] = intersection;
  switch (face) {
    case Dir.X_NEG:
      return [x - 1, y, z];
    case Dir.X_POS:
      return [x + 1, y, z];
    case Dir.Y_NEG:
      return [x, y - 1, z];
    case Dir.Y_POS:
      return [x, y + 1, z];
    case Dir.Z_NEG:
      return [x, y, z - 1];
    case Dir.Z_POS:
      return [x, y, z + 1];
  }
}
