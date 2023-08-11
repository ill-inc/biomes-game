import type { EventContext } from "@/server/logic/events/core";
import type {
  QueriedEntity,
  QueriedEntityWith,
} from "@/server/logic/events/query";
import type { SpecialRoles } from "@/shared/acl_types";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { RestoresTo } from "@/shared/ecs/gen/components";
import type {
  AclAction,
  EntityRestoreToState,
  ReadonlyAcl,
  ReadonlyAclDomain,
  ReadonlyVec3i,
  ShardId,
} from "@/shared/ecs/gen/types";
import { actionAllowed, pointsByShardForAclDomain } from "@/shared/game/acls";
import { getAclPreset } from "@/shared/game/acls_base";
import type { RestorationEntity } from "@/shared/game/restoration";
import { fieldRestorationDelay } from "@/shared/game/restoration";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { ok } from "assert";

// Function to restore an entity back to life after it has been iced.
// This is particularly complicated because we need to clear the way for it
// if we can. Namely, if there are other entities or terrain in the way that are
// temporary (e.g. restoring back to being gone), then we can just clear them
// immediately.
export function tryRestoreToCreated(
  entity: QueriedEntityWith<"id">,
  terrainRelevantEntities: QueriedEntityWith<"id">[],
  terrainIterators: Iterable<{
    blockPos: ReadonlyVec3;
    terrain: Terrain;
  }>[],
  context: EventContext<any>,
  onClear: () => void
) {
  ok(entity.iced());
  switch (
    tryClearTemporaryObstructions(
      terrainIterators,
      new Map(terrainRelevantEntities.map((x) => [x.id, x]))
    )
  ) {
    case "blocked":
      context.delete(entity.id);
      break;
    case "clear":
      onClear();
      entity.clearRestoresTo();
      break;
    case "retry":
      // If there were occupancy entities in the way, but they were
      // temporary, try again in a bit when they should be gone (after their
      // newly immediate restoration time triggers).
      const RETRY_TIME_S = 1;
      entity.mutableRestoresTo().trigger_at =
        secondsSinceEpoch() + RETRY_TIME_S;
  }
}

// Goes through the provided terrain iterators and checks each terrain point
// to see if it's currently occupied, and if it is, but it's a temporary
// occupation (e.g. the obstruction is going to be restored), then it
// immediately clears it and returns "clear". If it's not a temporary
// obstruction, then it returns "blocked". If an entity is in the occupancy
// tensor, it's more complicated, we set the entity to restore immediately
// and return "retry" to try again ourselves.
function tryClearTemporaryObstructions(
  terrainIterators: Iterable<{
    blockPos: ReadonlyVec3;
    terrain: Terrain;
  }>[],
  terrainRelevantEntities: Map<BiomesId, QueriedEntityWith<"id">>
): "blocked" | "clear" | "retry" {
  const blocks: { terrain: Terrain; blockPos: ReadonlyVec3 }[] = [];
  const entities: QueriedEntityWith<"id">[] = [];

  const addRestorableObstructions = (
    terrainIterator: Iterable<{
      blockPos: ReadonlyVec3;
      terrain: Terrain;
    }>
  ) => {
    const obstructions = findRestorableObstructions(
      terrainIterator,
      terrainRelevantEntities
    );
    if (obstructions === "blocked") {
      return false;
    } else {
      blocks.push(...obstructions.blocks);
      entities.push(...obstructions.entities);
      return true;
    }
  };

  for (const terrainIterator of terrainIterators) {
    if (!addRestorableObstructions(terrainIterator)) {
      return "blocked";
    }
  }

  if (entities.length === 0) {
    // If we don't have any entities obstructing us, just terrain, then
    // go ahead and clear the terrain so we can proceed.
    for (const block of blocks) {
      block.terrain.applyRestoration(block.blockPos);
      ok(block.terrain.terrainAt(block.blockPos) === 0);
    }

    return "clear";
  }

  // If we got here, we can clear the way, so do it.
  // Ideally, we would do this on the spot, but deleting entities can
  // involve more data (e.g. minigame connections), so we just adjust
  // restoration times instead and we'll   try again later.
  for (const entity of entities) {
    ok(entity.restoresTo()?.restore_to_state === "deleted");
    entity.mutableRestoresTo().trigger_at = 0;
  }

  return "retry";
}

interface RestorableObstructions {
  blocks: { terrain: Terrain; blockPos: ReadonlyVec3 }[];
  entities: QueriedEntityWith<"id">[];
}

function findRestorableObstructions(
  terrainIterator: Iterable<{
    blockPos: ReadonlyVec3;
    terrain: Terrain;
  }>,
  terrainRelevantEntities: Map<BiomesId, QueriedEntityWith<"id">>
): RestorableObstructions | "blocked" {
  const blocks: { terrain: Terrain; blockPos: ReadonlyVec3 }[] = [];
  const entities: QueriedEntityWith<"id">[] = [];

  for (const { blockPos, terrain } of terrainIterator) {
    const occupancy = terrain.occupancy.get(...blockPos);
    if (occupancy) {
      const entity = terrainRelevantEntities.get(occupancy as BiomesId);
      ok(entity);

      if (entity.restoresTo()?.restore_to_state === "deleted") {
        // This is a temporary obstruction, so clear it out.
        entities.push(entity);
      } else {
        // This is a permanent obstruction, so we can't clear it.
        return "blocked";
      }
    } else {
      const value = terrain.terrainAt(blockPos);
      if (value) {
        const valueAfterRestore = terrain.terrainAtAfterRestoration(blockPos);
        if (valueAfterRestore === 0) {
          blocks.push({ terrain, blockPos });
        } else {
          // This terrain obstruction is not temporary, we can't clear it.
          return "blocked";
        }
      }
    }
  }

  return { blocks, entities };
}

export function isTerrainRestoring(
  allTerrain: Terrain[],
  pointsByShard: Map<ShardId, ReadonlyVec3i[]>
): boolean {
  for (const [shardId, points] of pointsByShard) {
    const terrain = allTerrain.find((t) => t.shardId === shardId);
    ok(terrain);
    for (const point of points) {
      if (!terrain.isRestoring(point)) {
        // If there is no restoration, then we're not restoring the block.
        return false;
      }
    }
  }
  return true;
}

export function restorationDelay(
  userId: BiomesId,
  teamId: BiomesId | undefined,
  hasRole: (role: SpecialRoles) => boolean,
  action: AclAction,
  restorationEntities: RestorationEntity[],
  domain: ReadonlyAclDomain,
  allTerrain: Terrain[]
) {
  let restorationDelay: number | undefined;
  const accumRestore = (newDelay: number | undefined) => {
    if (newDelay !== undefined) {
      restorationDelay = Math.min(
        restorationDelay ?? Number.POSITIVE_INFINITY,
        newDelay
      );
    }
  };

  if (
    // Only apply muck restoration if we're not under the influence of any
    // restoration fields. E.g. if a robot is placed but the muck field hasn't
    // updated yet, we shouldn't restore the player's placements, the robot's
    // presence takes precedent.
    restorationEntities.length === 0 &&
    !muckRestoreAclCheck(userId, teamId, hasRole, action)
  ) {
    accumRestore(muckRestorationDelay(domain, allTerrain, action));
  }

  accumRestore(
    fieldRestorationDelay(restorationEntities, userId, teamId, hasRole, action)
  );

  return restorationDelay;
}

const DEFAULT_MUCK_RESTORE_ACL: ReadonlyAcl = {
  everyone: new Set(),
  entities: new Map(),
  teams: new Map(),
  roles: new Map([["groundskeeper", new Set(getAclPreset("Admin"))]]),
  creator: undefined,
  creatorTeam: undefined,
};

function muckRestoreAclCheck(
  userId: BiomesId,
  teamId: BiomesId | undefined,
  hasRole: (role: SpecialRoles) => boolean,
  action: AclAction
) {
  return actionAllowed(
    [DEFAULT_MUCK_RESTORE_ACL],
    action,
    { userId, teamId },
    hasRole
  );
}

function muckRestorationDelay(
  domain: ReadonlyAclDomain,
  allTerrain: Terrain[],
  action: AclAction
): number | undefined {
  const muck = highestMuckInAclDomain(domain, allTerrain);
  return CONFIG.muckRestorationEnabled && muck > CONFIG.muckRestorationThreshold
    ? action === "destroy"
      ? // Only destructions are actively restored, everything else is permanent
        // but flagged for restoration so that we could revert to what was there
        // before.
        CONFIG.muckRestorationDelaySecs
      : Number.POSITIVE_INFINITY
    : undefined;
}

function highestMuckInAclDomain(
  domain: ReadonlyAclDomain,
  allTerrain: Terrain[]
): number {
  let maxMuck = 0;
  const pointsByShard = pointsByShardForAclDomain(domain);
  for (const [shardId, points] of pointsByShard) {
    const terrain = allTerrain.find((t) => t.shardId === shardId);
    ok(terrain);
    for (const point of points) {
      maxMuck = Math.max(maxMuck, terrain.muck.get(...point));
    }
  }
  return maxMuck;
}

export function maybeSetRestoreTo(
  restoreTime: number | undefined,
  entity: QueriedEntity,
  restoreTo: EntityRestoreToState
): void {
  const timestamp = secondsSinceEpoch();
  const deletingTemporaryEntity =
    restoreTo === "created" &&
    entity.restoresTo()?.restore_to_state === "deleted";
  if (restoreTime !== undefined && !deletingTemporaryEntity) {
    entity.setRestoresTo(
      RestoresTo.create({
        trigger_at: timestamp + restoreTime,
        restore_to_state: restoreTo,
      })
    );
  } else {
    entity.clearRestoresTo();
  }
}

// Allowed on blocks that restoration will restore
export const ALLOWED_TEMPORARY_BLOCK_ACTIONS: AclAction[] = [
  "destroy",
  "shape",
  "tillSoil",
];
