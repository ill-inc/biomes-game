import { add, scale, shiftAABB, sub, truncate } from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import {
  collisionConstraint,
  collisionConstraintWithClimbing,
  multibodyCollisionConstraint,
} from "@/shared/physics/constraints";
import {
  airResistanceForce,
  escapeForce,
  frictionForce,
  gravityForce,
} from "@/shared/physics/forces";
import type {
  Body,
  ClimbableIndex,
  CollisionIndex,
  Constraint,
  Force,
  Movement,
} from "@/shared/physics/types";
import { intersecting } from "@/shared/physics/utils";
import type { DeepReadonly } from "@/shared/util/type_helpers";

export type Named<T> = [string, T];

interface Result {
  velocity: Vec3;
  movement: Movement;
}

export function moveBody(
  dt: number,
  body: Body,
  forces: Force[],
  constraints: Constraint[]
) {
  // Compute the candidate velocity.
  let velocity = body.velocity;
  for (const fn of forces) {
    velocity = add(velocity, fn(dt, body));
  }

  // Compute the movement impulse by applying constraints.
  let movement = { impulse: scale(dt, velocity), velocity };
  for (const fn of constraints) {
    movement = fn(body, movement);
  }

  // Truncate tiny output vectors to zero.
  movement.impulse = truncate(movement.impulse);
  movement.velocity = truncate(movement.velocity);

  return { velocity, movement };
}

export interface Environment {
  gravity: number;
  friction: number;
  airResistance: number;
  escapeDampening: number;
}

export function environmentForces(environment: Environment): Force[] {
  return [
    gravityForce(environment.gravity),
    frictionForce(environment.friction),
    airResistanceForce(environment.airResistance),
  ];
}

// Provides default motion suitable for most rigid bodies. The body experiences
// inertial motion that is augmented by the given input forces as well as a set
// of standard environment forces (e.g. gravity, friction, air resistance). The
// body will collide with AABBs defined by the given collision index, and extra
// constraints can further be provided as input.
export function moveBodySimple(
  dtSecs: number,
  body: Body,
  environment: Environment,
  collisionIndex: CollisionIndex,
  forces: Force[],
  constraints: Constraint[]
) {
  // If the body is _already_ colliding with something prior to any movement,
  // then we immediately apply an escape movement instead of normal motion.
  if (intersecting(collisionIndex, body.aabb)) {
    return moveBody(
      dtSecs,
      { aabb: body.aabb, velocity: [0, 0, 0] },
      [escapeForce(environment.escapeDampening, collisionIndex, body.aabb)],
      []
    );
  }

  // Apply basic movement.
  return moveBody(
    dtSecs,
    body,
    [...forces, ...environmentForces(environment)],
    [...constraints, collisionConstraint(collisionIndex)]
  );
}

export function isCollidingJoined(
  baseAABB: AABB,
  aabbs: AABB[],
  collisionIndex: CollisionIndex
) {
  for (const localAABB of aabbs) {
    const aabb = shiftAABB(localAABB, baseAABB[0]);
    if (intersecting(collisionIndex, aabb)) {
      return true;
    }
  }

  return false;
}

function maybeMoveEscape(
  dtSecs: number,
  body: Body,
  environment: Environment,
  collisionIndex: CollisionIndex
) {
  // If the body is _already_ colliding with something prior to any movement,
  // then we immediately apply an escape movement instead of normal motion.
  if (intersecting(collisionIndex, body.aabb)) {
    return moveBody(
      dtSecs,
      { aabb: body.aabb, velocity: [0, 0, 0] },
      [escapeForce(environment.escapeDampening, collisionIndex, body.aabb)],
      []
    );
  }
}

export function moveBodyJoined(
  dtSecs: number,
  body: Body,
  aabbs: AABB[],
  environment: Environment,
  collisionIndex: CollisionIndex,
  forces: Force[],
  constraints: Constraint[]
) {
  // If the body is _already_ colliding with something prior to any movement,
  // then we immediately apply an escape movement instead of normal motion.

  for (const localAABB of aabbs) {
    // TODO: largest magnitude AABB.
    const aabb = shiftAABB(localAABB, body.aabb[0]);
    const escape = maybeMoveEscape(
      dtSecs,
      { aabb: aabb, velocity: [0, 0, 0] },
      environment,
      collisionIndex
    );
    if (escape) {
      return escape;
    }
  }

  // Apply basic movement.
  return moveBody(
    dtSecs,
    body,
    [...forces, ...environmentForces(environment)],
    [...constraints, multibodyCollisionConstraint(aabbs, collisionIndex)]
  );
}

// Provides similar motion to moveBodySimple except that the collision permits
// the body to climb up climbable walls (as determined by the climbableIndex).
export function moveBodyWithClimbing(
  dtSecs: number,
  body: Body,
  environment: Environment,
  collisionIndex: CollisionIndex,
  climbableIndex: ClimbableIndex,
  forces: Force[],
  constraints: Constraint[]
) {
  const escape = maybeMoveEscape(dtSecs, body, environment, collisionIndex);
  if (escape) {
    return escape;
  }

  // Apply basic movement.
  return moveBody(
    dtSecs,
    body,
    [...forces, ...environmentForces(environment)],
    [
      ...constraints,
      collisionConstraintWithClimbing(collisionIndex, climbableIndex),
    ]
  );
}

export function moveBodyFlying(
  dtSecs: number,
  body: Body,
  environment: Environment,
  collisionIndex: CollisionIndex,
  forces: Force[]
) {
  const escape = maybeMoveEscape(dtSecs, body, environment, collisionIndex);
  if (escape) {
    return escape;
  }

  // Apply basic movement.
  return moveBody(
    dtSecs,
    body,
    [...forces, airResistanceForce(6)],
    [collisionConstraint(collisionIndex)]
  );
}

export function moveBodyFluid(
  dtSecs: number,
  body: Body,
  collisionIndex: CollisionIndex,
  forces: Force[],
  environment: Environment
) {
  const escape = maybeMoveEscape(dtSecs, body, environment, collisionIndex);
  if (escape) {
    return escape;
  }

  // Apply basic movement.
  return moveBody(
    dtSecs,
    body,
    [...forces, ...environmentForces(environment)],
    [collisionConstraint(collisionIndex)]
  );
}

export function getImpact(result: DeepReadonly<Result>) {
  return sub(result.velocity, result.movement.velocity);
}

export function getGroundImpact(result: DeepReadonly<Result>) {
  return Math.max(0, -getImpact(result)[1]);
}
