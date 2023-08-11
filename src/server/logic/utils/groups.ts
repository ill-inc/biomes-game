import type { AclChecker } from "@/server/logic/events/core";
import { RollbackError } from "@/server/logic/events/core";
import {
  GroupTensorAndPlaceablesTerrainIterator,
  GroupTensorTerrainIterator,
} from "@/server/logic/events/occupancy";
import { terrainCollides } from "@/shared/asset_defs/quirk_helpers";
import type { Terrain } from "@/shared/game/terrain/terrain";

import type { Reflect } from "@/shared/asset_defs/shapes";
import type { Box, ReadonlyBox } from "@/shared/ecs/gen/components";

import type { ReadonlyDeltaWith } from "@/shared/ecs/gen/delta";

import type { AclAction, ReadonlyBox2, Vec2f } from "@/shared/ecs/gen/types";
import {
  boxToAabb,
  rotatePositionWithinBox,
  terrainIdForTensorEntry,
} from "@/shared/game/group";
import { isBlockId, isFloraId, isGlassId } from "@/shared/game/ids";
import type { ShardId } from "@/shared/game/shard";
import * as Shards from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import {
  add,
  centerAABB,
  round,
  scale,
  sizeAABB,
  sub,
} from "@/shared/math/linear";
import type { Rotation } from "@/shared/math/rotation";
import {
  orientationToRotation,
  rotationToOrientation,
} from "@/shared/math/rotation";
import type { ReadonlyVec2, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { createCounter } from "@/shared/metrics/metrics";
import {
  isBlockGroupEntry,
  isFloraGroupEntry,
  isGlassGroupEntry,
  type GroupTensor,
} from "@/shared/wasm/types/galois";
import { ok } from "assert";

export function editShardedGroupVoxels(
  allTerrain: Terrain[],
  options: {
    creation?: {
      tensor: GroupTensor;
      box: ReadonlyBox;
      checkPlacerId?: BiomesId;
      setPlacerId?: BiomesId;
      checkOccupancyId?: BiomesId;
      setOccupancyId?: BiomesId;
      ignoreExistingBlocks?: boolean;
      ignoreExistingFlora?: boolean;
    };
    deletion?: {
      tensor: GroupTensor;
      box: ReadonlyBox;
      checkPlacerId?: BiomesId;
      checkOccupancyId?: BiomesId;
      ignoreMaterial?: boolean;
    };
    editVoxels?: boolean;
  }
) {
  // Edit voxel occupancy assignments.

  if (options.deletion) {
    for (const { terrain, blockPos } of new GroupTensorTerrainIterator(
      allTerrain,
      options.deletion.tensor,
      options.deletion.box
    )) {
      const existingOccupancyId = terrain.occupancy.get(...blockPos);
      if (
        options.deletion.checkOccupancyId &&
        existingOccupancyId &&
        existingOccupancyId !== options.deletion.checkOccupancyId
      ) {
        throw new RollbackError("Occupancy mismatch on deletion");
      }

      const existingPlacerId = terrain.placer.get(...blockPos);
      if (
        options.deletion.checkPlacerId &&
        existingPlacerId &&
        existingPlacerId !== options.deletion.checkPlacerId
      ) {
        throw new RollbackError("Placer mismatch on deletion");
      }

      terrain.setTerrainAt(
        blockPos,
        { occupancyId: INVALID_BIOMES_ID, placerId: INVALID_BIOMES_ID },
        undefined
      );
    }
  }
  if (options.creation) {
    for (const { terrain, blockPos } of new GroupTensorTerrainIterator(
      allTerrain,
      options.creation.tensor,
      options.creation.box
    )) {
      const existingOccupancyId = terrain.occupancy.get(...blockPos);
      if (
        options.creation.checkOccupancyId &&
        existingOccupancyId &&
        existingOccupancyId !== options.creation.checkOccupancyId
      ) {
        throw new RollbackError("Occupancy mismatch on creation");
      }
      const existingPlacerId = terrain.placer.get(...blockPos);
      if (
        options.creation.checkPlacerId &&
        existingPlacerId &&
        existingPlacerId !== options.creation.checkPlacerId
      ) {
        throw new RollbackError(
          `Placer mismatch on creation. Existing placer id: ${existingPlacerId}, expected placer id: ${options.creation.checkPlacerId}`
        );
      }

      terrain.setTerrainAt(
        blockPos,
        {
          occupancyId: options.creation.setOccupancyId,
          placerId: options.creation.setPlacerId,
        },
        undefined
      );
    }
  }

  // Edit actual voxels in the world.

  if (options.editVoxels) {
    if (options.deletion) {
      for (const {
        terrain,
        blockPos,
        tensorEntry,
      } of new GroupTensorTerrainIterator(
        allTerrain,
        options.deletion.tensor,
        options.deletion.box
      )) {
        const tensorTerrainId = terrainIdForTensorEntry(tensorEntry);
        // Verify that we're deleting the correct block.
        const terrainId = terrain.terrainAt(blockPos);
        ok(options.deletion.ignoreMaterial || terrainId === tensorTerrainId);
        terrain.clearTerrainAt(blockPos, undefined);
      }
    }
    if (options.creation) {
      for (const {
        terrain,
        blockPos,
        tensorEntry,
      } of new GroupTensorTerrainIterator(
        allTerrain,
        options.creation.tensor,
        options.creation.box
      )) {
        const tensorTerrainId = terrainIdForTensorEntry(tensorEntry);
        const existingTerrainId = terrain.terrainAt(blockPos);
        if (
          existingTerrainId &&
          !options.creation.ignoreExistingBlocks &&
          isBlockId(existingTerrainId)
        ) {
          throw new RollbackError("Tried to override existing block");
        }
        if (
          existingTerrainId &&
          !options.creation.ignoreExistingBlocks &&
          isGlassId(existingTerrainId)
        ) {
          throw new RollbackError("Tried to override existing glass");
        }
        if (
          existingTerrainId &&
          !options.creation.ignoreExistingFlora &&
          isFloraId(existingTerrainId)
        ) {
          throw new RollbackError("Tried to override existing flora");
        }

        if (isFloraGroupEntry(tensorEntry)) {
          terrain.setTerrainAt(blockPos, { value: tensorTerrainId }, undefined);
        } else if (isBlockGroupEntry(tensorEntry)) {
          terrain.setTerrainAt(
            blockPos,
            {
              value: tensorTerrainId,
              shapeId: tensorEntry.block.isomorphism_id,
              dyeId: tensorEntry.block.dye,
              moistureId: tensorEntry.block.moisture,
            },
            undefined
          );
        } else if (isGlassGroupEntry(tensorEntry)) {
          terrain.setTerrainAt(
            blockPos,
            {
              value: tensorTerrainId,
              shapeId: tensorEntry.glass.isomorphism_id,
              dyeId: tensorEntry.glass.dye,
              moistureId: tensorEntry.glass.moisture,
            },
            undefined
          );
        }
      }
    }
  }
}

export function transformBoxOwnedPosition(
  oldPosition: ReadonlyVec3,
  oldOrientation: ReadonlyVec2 | undefined,
  oldBox: ReadonlyBox,
  newBox: ReadonlyBox,
  rotation: Rotation = 0,
  reflection: Reflect = [0, 0, 0]
): [Vec3, Vec2f] {
  const oldSize = sizeAABB(boxToAabb(oldBox));
  const oldRotation = orientationToRotation(oldOrientation);
  const newOrientation = rotationToOrientation(oldRotation + rotation);

  const newPosition = add(
    rotatePositionWithinBox(
      sub(oldPosition, oldBox.v0),
      rotation,
      reflection,
      oldSize
    ),
    newBox.v0
  );

  return [newPosition, newOrientation];
}

export function transformBoxOwnedBox(
  box: ReadonlyBox,
  oldBox: ReadonlyBox,
  newBox: ReadonlyBox,
  rotation: Rotation = 0,
  reflection: Reflect = [0, 0, 0]
): Box {
  const size = sizeAABB(boxToAabb(box));
  const rotatedSize: Vec3 =
    rotation === 0 || rotation === 2 ? size : [size[2], size[1], size[0]];
  const halfRotatedSize = scale(0.5, rotatedSize);

  const center = centerAABB(boxToAabb(box));
  const rotatedCenter = transformBoxOwnedPosition(
    center,
    undefined,
    oldBox,
    newBox,
    rotation,
    reflection
  )[0];

  return {
    v0: round(sub(rotatedCenter, halfRotatedSize)),
    v1: round(add(rotatedCenter, halfRotatedSize)),
  };
}

export const groupsCreated = createCounter({
  name: "game_groups_created",
  help: "Number of groups created",
});

export function involvedShards(
  ...aabbs: (undefined | ReadonlyBox2)[]
): ShardId[] {
  const shards = new Set<ShardId>();
  for (const aabb of aabbs) {
    if (aabb === undefined) {
      continue;
    }
    for (const shard of Shards.shardsForAABB(aabb.v0, aabb.v1)) {
      shards.add(shard);
    }
  }
  return Array.from(shards);
}

// Check permissions for all positions.
export function checkGroupPermissions(
  allTerrain: Terrain[],
  tensor: GroupTensor,
  box: ReadonlyBox,
  placeables:
    | ReadonlyDeltaWith<"placeable_component" | "position" | "orientation">[]
    | undefined,
  aclAction: AclAction,
  acl: AclChecker
) {
  const points: ReadonlyVec3[] = [];
  const clearPoints: ReadonlyVec3[] = [];
  for (const {
    worldPos,
    terrainId,
  } of new GroupTensorAndPlaceablesTerrainIterator(
    allTerrain,
    tensor,
    box,
    placeables
  )) {
    points.push(worldPos);
    if (terrainId && !terrainCollides(terrainId)) {
      clearPoints.push(worldPos);
    }
  }
  return (
    acl.can(aclAction, { atPoints: points }) &&
    acl.can("destroy", { atPoints: clearPoints })
  );
}
