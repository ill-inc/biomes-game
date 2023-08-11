import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { CollisionHelper } from "@/shared/game/collision";
import {
  add,
  centerAndSideLengthToAABB,
  normalizev,
  scale,
  zeroVector,
} from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import {
  awayFromBlocksAndBounds,
  awayFromPlayer,
  getDirectionTowardsAABBIntersection,
  getRandomDirection,
  getVolumeTakenByBox,
  towardsCurrentDirection,
} from "@/shared/npc/behavior/shared_actions";
import type { Environment } from "@/shared/npc/environment";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import { toForce } from "@/shared/physics/forces";
import type { Force } from "@/shared/physics/types";
import { ok } from "assert";

export function swimTick(
  env: Environment,
  npc: SimulatedNpc
): {
  force: Force;
} {
  ok(npc.type.behavior.swim);

  const {
    towardsCurrentDirectionStrength,
    awayFromBlocksAndBoundsRadius,
    awayFromBlocksAndBoundsStrength,
    stayInWaterStrength,
    randomForceProbability,
    randomForceStrength,
  } = npc.type.behavior.swim;

  let forceDirection = zeroVector;

  if (npc.type.behavior.swim.isShyOfPlayers) {
    // Go away from players.
    const { awayFromPlayerRadius, awayFromPlayerStrength } =
      npc.type.behavior.swim.isShyOfPlayers;
    forceDirection = add(
      forceDirection,
      awayFromPlayer({
        env,
        npc,
        radius: awayFromPlayerRadius,
        strength: awayFromPlayerStrength,
      })
    );
  }

  // Go towards current direction but only in xz-plane.
  forceDirection = add(
    forceDirection,
    towardsCurrentDirection({
      npc,
      strength: towardsCurrentDirectionStrength,
    })
  );

  if (npc.type.behavior.swim.shouldFlock) {
    // Go towards other NPCs and in the same direction as other NPCs.
    const {
      attractOtherEntitiesStrength,
      followOtherEntitiesStrength,
      towardsOtherEntitiesRadius,
    } = npc.type.behavior.swim.shouldFlock;
    forceDirection = add(
      forceDirection,
      towardsOtherEntitiesDirection({
        env,
        npc,
        attractOtherEntitiesStrength,
        followOtherEntitiesStrength,
        towardsOtherEntitiesRadius,
      })
    );
  }

  // Make large npcs move slower.
  const npcSize = npc.size;
  const npcAverageLength = (npcSize[0] + npcSize[1] + npcSize[2]) / 3;
  const defaultAverageLength =
    (npc.type.boxSize[0] + npc.type.boxSize[1] + npc.type.boxSize[2]) / 3;
  if (npcAverageLength > defaultAverageLength) {
    forceDirection = scale(
      defaultAverageLength / npcAverageLength,
      forceDirection
    );
  }

  // Go away from blocks and world bounds.
  forceDirection = add(
    forceDirection,
    awayFromBlocksAndBounds({
      env,
      npc,
      radius: awayFromBlocksAndBoundsRadius,
      strength: awayFromBlocksAndBoundsStrength,
    })
  );

  // Once in a while, have a random force.
  if (Math.random() < randomForceProbability) {
    forceDirection = add(
      forceDirection,
      getRandomDirection({ length: randomForceStrength })
    );
  }

  // Stay in the water.
  const depth = getDepthInWater({ env, npc, maxDepthToCheck: 1 });
  // The fish cannot swim when it is out of the water so zero out the force.
  if (depth <= 0) {
    forceDirection = zeroVector;
  }
  forceDirection = add(
    forceDirection,
    stayInWater({ depth, stayInWaterStrength })
  );

  return {
    force: toForce(forceDirection),
  };
}

// Determines how deep in water the entity is.
// Only checks up to the `maxDepthToCheck` so if the entity is deeper
// than `maxDepthToCheck`, it will just return `maxDepthToCheck`.
function getDepthInWater({
  npc,
  env,
  maxDepthToCheck,
}: {
  npc: SimulatedNpc;
  env: Environment;
  maxDepthToCheck: number;
}): number {
  // Create a box column above the entity and see how much of it is filled with water.
  const anchor = npc.position;
  const columnWidth = 0.25;
  const collisionBox: AABB = [
    [anchor[0] - columnWidth / 2, anchor[1], anchor[2] - columnWidth / 2],
    [
      anchor[0] + columnWidth / 2,
      anchor[1] + maxDepthToCheck,
      anchor[2] + columnWidth / 2,
    ],
  ];

  const volumeInColumn = getVolumeTakenByBox({
    aabb: collisionBox,
    boxesIndex: (id) => env.resources.get("/water/boxes", id),
  });

  return volumeInColumn / (columnWidth * columnWidth);
}

function stayInWater({
  depth,
  stayInWaterStrength,
}: {
  depth: number;
  stayInWaterStrength: number;
}): Vec3 {
  if (depth <= 0) {
    return [0, -2 * stayInWaterStrength, 0];
  }
  if (depth <= 0.5) {
    return [0, -1 * stayInWaterStrength, 0];
  }
  return zeroVector;
}

function towardsOtherEntitiesDirection({
  env,
  npc,
  attractOtherEntitiesStrength,
  followOtherEntitiesStrength,
  towardsOtherEntitiesRadius,
}: {
  env: Environment;
  npc: SimulatedNpc;
  attractOtherEntitiesStrength: number;
  followOtherEntitiesStrength: number;
  towardsOtherEntitiesRadius: number;
}): Vec3 {
  const boxSize = towardsOtherEntitiesRadius * 2;
  const collisionBox = centerAndSideLengthToAABB(npc.position, boxSize);

  let entityAttraction = zeroVector;
  let entityFollow = zeroVector;

  CollisionHelper.intersectEntities(
    env.table,
    collisionBox,
    (hit: AABB, entity) => {
      const isEntitySameType =
        entity?.npc_metadata?.type_id === npc.metadata.type_id;
      if (!entity || entity.id === npc.id || !isEntitySameType) {
        return;
      }

      // Go towards other fish.
      entityAttraction = add(
        entityAttraction,
        getEntityAttractionDirection({
          hit,
          collisionBox,
          npc,
          attractOtherEntitiesStrength,
        })
      );

      // Go in the same direction as other close by fish.
      entityFollow = add(
        entityFollow,
        getEntityFollowDirection({
          hit,
          collisionBox,
          npc,
          entity,
          followOtherEntitiesStrength,
        })
      );
    }
  );

  return add(entityAttraction, scale(0.5, entityFollow));
}

function getEntityAttractionDirection({
  hit,
  collisionBox,
  npc,
  attractOtherEntitiesStrength,
}: {
  hit: AABB;
  collisionBox: AABB;
  npc: SimulatedNpc;
  attractOtherEntitiesStrength: number;
}): Vec3 {
  const directionAndLength = getDirectionTowardsAABBIntersection({
    point: npc.position,
    box1: hit,
    box2: collisionBox,
  });

  if (!directionAndLength) {
    return zeroVector;
  }

  const { direction, length } = directionAndLength;

  // Sweet spot is to have fish 2.5 voxels apart. When further than
  // 2.5 voxels, have an attracting force and when closer than 2.5 voxels
  // have a repelling force.
  const optimalDistanceApart = 2.5;
  const yIntercept = -1 * attractOtherEntitiesStrength * optimalDistanceApart;

  return scale(
    length * attractOtherEntitiesStrength + yIntercept,
    normalizev(direction)
  );
}

function getEntityFollowDirection({
  hit,
  collisionBox,
  npc,
  entity,
  followOtherEntitiesStrength,
}: {
  hit: AABB;
  collisionBox: AABB;
  npc: SimulatedNpc;
  entity: ReadonlyEntity;
  followOtherEntitiesStrength: number;
}): Vec3 {
  const otherVelocity = entity.rigid_body?.velocity;
  const directionAndLength = getDirectionTowardsAABBIntersection({
    point: npc.position,
    box1: hit,
    box2: collisionBox,
  });

  if (!directionAndLength || !otherVelocity) {
    return zeroVector;
  }

  const { length } = directionAndLength;

  return scale(
    (1 / Math.max(length, 0.01)) * followOtherEntitiesStrength,
    normalizev(otherVelocity)
  );
}
