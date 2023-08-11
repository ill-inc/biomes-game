import {
  add,
  length,
  normalizev,
  scale,
  sub,
  zeroVector,
} from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import {
  awayFromBlocksAndBounds,
  awayFromPlayer,
  getRandomDirection,
  getVolumeTakenByBox,
  towardsCurrentDirection,
} from "@/shared/npc/behavior/shared_actions";
import type { Environment } from "@/shared/npc/environment";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import { toForce } from "@/shared/physics/forces";
import type { Force } from "@/shared/physics/types";
import { ok } from "assert";

export function flyTick(
  env: Environment,
  npc: SimulatedNpc
): {
  force: Force;
} {
  ok(npc.type.behavior.fly);

  let forceDirection = zeroVector;

  const {
    awayFromPlayerRadius,
    awayFromPlayerStrength,
    towardsCurrentDirectionStrength,
    awayFromBlocksAndBoundsRadius,
    awayFromBlocksAndBoundsStrength,
    randomForceProbability,
    randomForceStrength,
    optimalDistanceFromGround,
    stayDistanceFromSpawn,
    towardsSpawnStrength,
    oscillate,
  } = npc.type.behavior.fly;

  // Go away from players.
  forceDirection = add(
    forceDirection,
    awayFromPlayer({
      env,
      npc,
      radius: awayFromPlayerRadius,
      strength: awayFromPlayerStrength,
    })
  );

  // Go towards current direction but only in xz-plane.
  forceDirection = add(
    forceDirection,
    towardsCurrentDirection({
      npc,
      strength: towardsCurrentDirectionStrength,
    })
  );

  // Go away from blocks and bounds.
  forceDirection = add(
    forceDirection,
    awayFromBlocksAndBounds({
      env,
      npc,
      radius: awayFromBlocksAndBoundsRadius,
      strength: awayFromBlocksAndBoundsStrength,
    })
  );

  // Stay a specified distance above the ground.
  const distanceFromGround = getDistanceFromGround({
    env,
    position: getPositionAhead({
      npc,
      distance: awayFromBlocksAndBoundsRadius + 1,
    }),
    maxDepthToCheck: optimalDistanceFromGround,
  });
  if (distanceFromGround < optimalDistanceFromGround) {
    forceDirection = add(
      forceDirection,
      awayFromGround({ distanceFromGround, optimalDistanceFromGround })
    );
  }

  // Once in a while, have a random force.
  if (Math.random() < randomForceProbability) {
    forceDirection = add(
      forceDirection,
      getRandomDirection({ length: randomForceStrength })
    );
  }

  if (oscillate) {
    // Bob up and down slightly for more liveliness.
    const { periodSeconds, strength } = oscillate;
    forceDirection = add(
      forceDirection,
      getOscillatingForce({ offset: npc.id, periodSeconds, strength })
    );
  }

  // Stay near their spawn point if they wander too far.
  const { directionToSpawn, distanceFromSpawn } = getDistanceFromSpawn({
    npc,
  });
  if (distanceFromSpawn > stayDistanceFromSpawn) {
    forceDirection = add(
      forceDirection,
      towardsSpawn({ directionToSpawn, towardsSpawnStrength })
    );
  }

  return {
    force: toForce(forceDirection),
  };
}

function towardsSpawn({
  directionToSpawn,
  towardsSpawnStrength,
}: {
  directionToSpawn: Vec3;
  towardsSpawnStrength: number;
}) {
  return scale(towardsSpawnStrength, [
    directionToSpawn[0],
    0,
    directionToSpawn[2],
  ]);
}

function getDistanceFromSpawn({ npc }: { npc: SimulatedNpc }): {
  distanceFromSpawn: number;
  directionToSpawn: Vec3;
} {
  const spawnPosition = npc.metadata.spawn_position;
  const currentPosition = npc.position;
  // Ignore the distance in the Y axis.
  const toSpawn = sub(
    [spawnPosition[0], 0, spawnPosition[2]],
    [currentPosition[0], 0, currentPosition[2]]
  );
  return {
    distanceFromSpawn: length(toSpawn),
    directionToSpawn: normalizev(toSpawn),
  };
}

function getOscillatingForce({
  offset,
  periodSeconds,
  strength,
}: {
  offset: number;
  periodSeconds: number;
  strength: number;
}): Vec3 {
  return [
    0,
    Math.sin(
      (Math.PI / (periodSeconds * 1000)) * new Date().getTime() + offset
    ) * strength,
    0,
  ];
}

// Gets the position of the entity `distance` blocks ahead of where it is heading.
function getPositionAhead({
  npc,
  distance,
}: {
  npc: SimulatedNpc;
  distance: number;
}) {
  const direction = npc.velocity;
  return add(
    npc.position,
    scale(distance, normalizev([direction[0], 0, direction[2]]))
  );
}

function awayFromGround({
  distanceFromGround,
  optimalDistanceFromGround,
}: {
  distanceFromGround: number;
  optimalDistanceFromGround: number;
}): Vec3 {
  return [
    0,
    (optimalDistanceFromGround - distanceFromGround) /
      optimalDistanceFromGround,
    0,
  ];
}

function getDistanceFromGround({
  position,
  env,
  maxDepthToCheck,
}: {
  position: Vec3;
  env: Environment;
  maxDepthToCheck: number;
}) {
  const columnWidth = 0.25;
  const collisionBox: AABB = [
    [
      position[0] - columnWidth / 2,
      position[1] - maxDepthToCheck,
      position[2] - columnWidth / 2,
    ],
    [position[0] + columnWidth / 2, position[1], position[2] + columnWidth / 2],
  ];

  const volumeOfBlocks = getVolumeTakenByBox({
    aabb: collisionBox,
    boxesIndex: (id) => env.resources.get("/physics/boxes", id),
  });
  const volumeOfWater = getVolumeTakenByBox({
    aabb: collisionBox,
    boxesIndex: (id) => env.resources.get("/water/boxes", id),
  });

  const heightAboveBlocks =
    (columnWidth * columnWidth * maxDepthToCheck - volumeOfBlocks) /
    (columnWidth * columnWidth);
  const heightAboveWater =
    (columnWidth * columnWidth * maxDepthToCheck - volumeOfWater) /
    (columnWidth * columnWidth);

  return Math.min(heightAboveBlocks, heightAboveWater);
}
