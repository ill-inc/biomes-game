import type { ReadonlyWorldMetadata } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import { anItem } from "@/shared/game/item";
import * as Shards from "@/shared/game/shard";
import type { SpatialTable } from "@/shared/game/spatial";
import { add, shiftAABB, sizeAABB, sub } from "@/shared/math/linear";
import type { AABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { ok } from "assert";

export interface Boxes {
  intersect(aabb: AABB, fn: (hit: AABB) => boolean | void): void;
}

export type BoxesIndex = (shardId: Shards.ShardId) => Boxes | undefined;

export type CollisionCallback = (
  hit: AABB,
  entity?: ReadonlyEntity
) => boolean | void;

export class CollisionHelper {
  private constructor() {}

  static intersectAABB(index: BoxesIndex, aabb: AABB, fn: CollisionCallback) {
    const shards = Shards.shardsForAABB(...aabb);
    for (const shard of shards) {
      const boxes = index(shard);
      if (boxes) {
        boxes.intersect(aabb, (aabb) => fn(aabb));
      }
    }
  }

  static intersectAnyAABB(index: BoxesIndex, aabb: AABB) {
    let ret = false;
    this.intersectAABB(index, aabb, () => {
      ret = true;
      return true;
    });
    return ret;
  }

  static pointInAABB(index: BoxesIndex, point: ReadonlyVec3) {
    const epsilon: Vec3 = [1e-2, 1e-2, 1e-2];
    return this.intersectAnyAABB(index, [
      sub(point, epsilon),
      add(point, epsilon),
    ]);
  }

  static intersectEntities(
    table: SpatialTable,
    aabb: AABB,
    fn: CollisionCallback
  ) {
    for (const id of table.metaIndex.collideable_selector.scanAabb(aabb)) {
      const entity = table.get(id)!;
      if (isCollidable(entity)) {
        const aabb = getAabbForEntity(entity, { extentsType: "collidable" });
        ok(aabb);
        fn(aabb, entity);
      }
    }
  }

  static intersectWorldBounds(
    worldMetadata: ReadonlyWorldMetadata,
    aabb: AABB,
    fn: CollisionCallback
  ) {
    const intersectWorldBoundary = (shift: Vec3) => {
      fn(shiftAABB([worldMetadata.aabb.v0, worldMetadata.aabb.v1], shift));
    };

    const [w, h, d] = sizeAABB([worldMetadata.aabb.v0, worldMetadata.aabb.v1]);
    if (aabb[0][0] < worldMetadata.aabb.v0[0]) {
      intersectWorldBoundary([-w, 0, 0]);
    }
    if (aabb[0][1] < worldMetadata.aabb.v0[1]) {
      intersectWorldBoundary([0, -h, 0]);
    }
    if (aabb[0][2] < worldMetadata.aabb.v0[2]) {
      intersectWorldBoundary([0, 0, -d]);
    }
    if (aabb[1][0] > worldMetadata.aabb.v1[0]) {
      intersectWorldBoundary([w, 0, 0]);
    }
    if (aabb[1][1] > worldMetadata.aabb.v1[1]) {
      intersectWorldBoundary([0, h, 0]);
    }
    if (aabb[1][2] > worldMetadata.aabb.v1[2]) {
      intersectWorldBoundary([0, 0, d]);
    }
  }

  // Does a general AABB intersection test against the terrain and entities.
  static intersect(
    boxes: BoxesIndex,
    table: SpatialTable,
    worldMetadata: ReadonlyWorldMetadata,
    aabb: AABB,
    fn: CollisionCallback
  ) {
    // Test if the box intersects any of the terrain shards.
    CollisionHelper.intersectAABB(boxes, aabb, fn);
    // Test if the box intersects any entities.
    CollisionHelper.intersectEntities(table, aabb, fn);
    // Also test against the world boundaries.
    CollisionHelper.intersectWorldBounds(worldMetadata, aabb, fn);
  }
}

export function isCollidable(entity: ReadonlyEntity): boolean {
  if (entity.health && entity.health.hp <= 0) {
    // Dead entities don't cause collisions.
    return false;
  }

  if (
    entity.placeable_component &&
    anItem(entity.placeable_component.item_id).isUncollideable
  ) {
    return false;
  }

  if (entity.blueprint_component) {
    // Blueprints are interactable (e.g. respond to the player's cursor), but
    // not actually collidable. So we mark them with the `collidable` component,
    // so they register with the cursor raycasting, but leave them out of
    // intersection tests.
    return false;
  }

  return !!entity.collideable;
}
