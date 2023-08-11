import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { BoxesIndex } from "@/shared/game/collision";
import { CollisionHelper } from "@/shared/game/collision";
import {
  add,
  centerAABB,
  centerAndSideLengthToAABB,
  getIntersectionAABB,
  length,
  neg,
  normalizev,
  scale,
  sub,
  volumeAABB,
  zeroVector,
} from "@/shared/math/linear";
import type { AABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { getNearestPlayer } from "@/shared/npc/behavior/chase_attack";
import type { Environment } from "@/shared/npc/environment";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import type { Optional } from "@/shared/util/type_helpers";

export function towardsCurrentDirection({
  npc,
  strength,
}: {
  npc: SimulatedNpc;
  strength: number;
}): Vec3 {
  const currentVelocity = npc.velocity;
  return scale(
    strength,
    normalizev([currentVelocity[0], 0, currentVelocity[2]])
  );
}

export function awayFromBlocksAndBounds({
  env,
  npc,
  radius,
  strength,
}: {
  env: Environment;
  npc: SimulatedNpc;
  radius: number;
  strength: number;
}): Vec3 {
  // Find all blocks and world bounds that are close by generating
  // a larger box around the entity and seeing the intersection of this
  // larger box and the world.
  const boxSize = radius * 2;
  const collisionBox = centerAndSideLengthToAABB(npc.position, boxSize);

  let result = zeroVector;
  const addRepulsion = (hit: AABB) => {
    result = add(
      result,
      getBlockAndBoundRepellingDirection({ collisionBox, hit, npc, strength })
    );
  };

  // Repel from blocks.
  CollisionHelper.intersectAABB(
    (id) => env.resources.get("/physics/boxes", id),
    collisionBox,
    addRepulsion
  );

  // Repel from world bounds.
  const metadata = env.resources.get("/ecs/metadata");
  CollisionHelper.intersectWorldBounds(metadata, collisionBox, addRepulsion);

  return result;
}

export function getRandomDirection({ length }: { length: number }) {
  return scale(length, [
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5,
  ]);
}

export function awayFromPlayer({
  env,
  npc,
  radius,
  strength,
}: {
  env: Environment;
  npc: SimulatedNpc;
  radius: number;
  strength: number;
}): Vec3 {
  const playerId = getNearestPlayer(env, npc.position, radius);
  if (playerId) {
    const playerEntity = env.resources.get("/ecs/entity", playerId);
    if (!playerEntity) {
      return zeroVector;
    }
    return getPlayerRepellingDirection({ playerEntity, npc, strength });
  }
  return zeroVector;
}

function getPlayerRepellingDirection({
  playerEntity,
  npc,
  strength,
}: {
  playerEntity: ReadonlyEntity;
  npc: SimulatedNpc;
  strength: number;
}): Vec3 {
  if (!playerEntity.position) {
    return zeroVector;
  }
  const vecToPlayer = sub(npc.position, playerEntity.position.v);
  return scale(strength, normalizev(vecToPlayer));
}

export function getBlockAndBoundRepellingDirection({
  hit,
  collisionBox,
  npc,
  strength,
}: {
  hit: AABB;
  collisionBox: AABB;
  npc: SimulatedNpc;
  strength: number;
}): Vec3 {
  const directionAndLength = getDirectionAwayFromAABBIntersection({
    point: npc.position,
    box1: hit,
    box2: collisionBox,
  });

  if (!directionAndLength) {
    return zeroVector;
  }

  const { direction, length } = directionAndLength;

  return scale((1 / Math.max(length, 0.01)) * strength, normalizev(direction));
}

export const getDirectionTowardsAABBIntersection = ({
  point,
  box1,
  box2,
}: {
  point: ReadonlyVec3;
  box1: AABB;
  box2: AABB;
}): Optional<{ direction: Vec3; length: number }> => {
  const collisionIntersection = getIntersectionAABB(box1, box2);
  if (!collisionIntersection) {
    return undefined;
  }
  const center = centerAABB(collisionIntersection);
  const direction = sub(center, point);

  return { direction, length: length(direction) };
};

export const getDirectionAwayFromAABBIntersection = ({
  point,
  box1,
  box2,
}: {
  point: ReadonlyVec3;
  box1: AABB;
  box2: AABB;
}): Optional<{ direction: Vec3; length: number }> => {
  const directionAndLength = getDirectionTowardsAABBIntersection({
    point,
    box1,
    box2,
  });

  if (!directionAndLength) {
    return undefined;
  }

  const { direction, length } = directionAndLength;

  return { direction: neg(direction), length };
};

export function getVolumeTakenByBox({
  aabb,
  boxesIndex,
}: {
  boxesIndex: BoxesIndex;
  aabb: AABB;
}): number {
  let volume = 0;
  CollisionHelper.intersectAABB(boxesIndex, aabb, (hit: AABB) => {
    const intersection = getIntersectionAABB(aabb, hit);
    if (!intersection) {
      return;
    }
    volume += volumeAABB(intersection);
  });

  return volume;
}
