import { add, lengthSq, shiftAABB } from "@/shared/math/linear";
import { absMax, absMin } from "@/shared/math/math";
import type { AABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import type {
  Body,
  ClimbableIndex,
  CollisionIndex,
  Constraint,
  GroundedIndex,
  Movement,
} from "@/shared/physics/types";
import type { DeepReadonly } from "@/shared/util/type_helpers";

function moveAlongAxis(aabb: AABB, axis: 0 | 1 | 2, impulse: Readonly<Vec3>) {
  aabb[0][axis] += impulse[axis];
  aabb[1][axis] += impulse[axis];
}

// The below function finds the first point of collision along an axis-aligned
// direction and returns the magnitude of the repulsion vector required to undo
// collision along that direction.
function collisionAlongAxis(
  index: CollisionIndex,
  aabb: AABB,
  impulse: Readonly<Vec3>,
  axis: 0 | 1 | 2
) {
  // Calculate the minimum axial vector required to prevent collision.
  let repulsion = 0;
  index(aabb, ([v0, v1]) => {
    if (impulse[axis] >= 0) {
      repulsion = absMax(repulsion, v0[axis] - aabb[1][axis]);
    } else {
      repulsion = absMax(repulsion, v1[axis] - aabb[0][axis]);
    }
  });

  // Return the correction.
  return absMin(repulsion, -impulse[axis]);
}

function integratedCollision(
  index: CollisionIndex,
  body: DeepReadonly<Body>,
  impulse: DeepReadonly<Vec3>
) {
  // TODO(tg): We iterate over y last since player bodies are taller than they
  // are wide and this avoids a double-intersection bug. We should instead fix
  // this directly by iterating until convergence here.
  const repulsion: Vec3 = [0, 0, 0];
  const aabb = [[...body.aabb[0]], [...body.aabb[1]]] as AABB;
  for (const i of [0, 2, 1] as const) {
    moveAlongAxis(aabb, i, impulse);
    repulsion[i] = collisionAlongAxis(index, aabb, impulse, i);
    moveAlongAxis(aabb, i, repulsion);
  }
  return repulsion;
}

function collided(
  repulsion: ReadonlyVec3,
  velocity: ReadonlyVec3,
  axis: 0 | 1 | 2
) {
  return Math.sign(repulsion[axis] * velocity[axis]) === -1;
}

// Implements a repulsion-based force to prevent collision. If the body is not
// colliding before its motion, then its motion will be truncated to prevent a
// collision. Momentum is cleared in the direction of any collision.
export function collisionConstraint(index: CollisionIndex): Constraint {
  return (body: DeepReadonly<Body>, move: DeepReadonly<Movement>) => {
    const repulsion = integratedCollision(index, body, move.impulse);
    return {
      impulse: add(move.impulse, repulsion),
      velocity: [
        collided(repulsion, move.velocity, 0) ? 0 : move.velocity[0],
        collided(repulsion, move.velocity, 1) ? 0 : move.velocity[1],
        collided(repulsion, move.velocity, 2) ? 0 : move.velocity[2],
      ],
    };
  };
}

export function multibodyCollisionConstraint(
  localSpaceAABBs: AABB[],
  index: CollisionIndex
): Constraint {
  return (body: DeepReadonly<Body>, move: DeepReadonly<Movement>) => {
    let repulsion = [0, 0, 0] as Vec3;

    for (const aabb of localSpaceAABBs) {
      const globalAABB = shiftAABB(aabb, body.aabb[0]);
      const candidateRepulsion = integratedCollision(
        index,
        {
          aabb: globalAABB,
          velocity: body.velocity,
        },
        move.impulse
      );

      if (lengthSq(candidateRepulsion) > lengthSq(repulsion)) {
        repulsion = candidateRepulsion;
      }
    }

    return {
      impulse: add(move.impulse, repulsion),
      velocity: [
        collided(repulsion, move.velocity, 0) ? 0 : move.velocity[0],
        collided(repulsion, move.velocity, 1) ? 0 : move.velocity[1],
        collided(repulsion, move.velocity, 2) ? 0 : move.velocity[2],
      ],
    };
  };
}

function impulseDirectionAlongAxis(impulse: Readonly<Vec3>, axis: 0 | 1 | 2) {
  const ret: Vec3 = [0, 0, 0];
  ret[axis] = impulse[axis] / Math.abs(impulse[axis]);
  return ret;
}

// Implements a repulsion-based force to prevent collision. If the body collides
// in the x or z direction with a climbable suface, then its forward impulse is
// converted into upward motion and that directions momentum is conserved.
export function collisionConstraintWithClimbing(
  collisionIndex: CollisionIndex,
  climbableIndex: ClimbableIndex
) {
  return (body: DeepReadonly<Body>, move: DeepReadonly<Movement>) => {
    const aabb = [[...body.aabb[0]], [...body.aabb[1]]] as AABB;

    // Apply lateral movements.
    const repulsion: Vec3 = [0, 0, 0];
    const velocity: Vec3 = [...move.velocity];
    for (const i of [0, 2] as const) {
      moveAlongAxis(aabb, i, move.impulse);
      repulsion[i] = collisionAlongAxis(collisionIndex, aabb, move.impulse, i);
      moveAlongAxis(aabb, i, repulsion);
      if (collided(repulsion, velocity, i)) {
        if (climbableIndex(aabb, impulseDirectionAlongAxis(move.impulse, i))) {
          repulsion[1] = Math.max(repulsion[1], Math.abs(repulsion[i]));
        } else {
          velocity[i] = 0;
        }
      }
    }

    // Apply vertical movements.
    let impulse: Vec3 = [...move.impulse];

    // If we're climbing, zero out any external downward movement (e.g. from
    // gravity), so effectively you cannot move down if you're climbing.
    if (repulsion[1] !== 0) {
      impulse[1] = Math.max(0, impulse[1]);
      velocity[1] = Math.max(0, velocity[1]);
    }

    impulse = add(impulse, repulsion);
    moveAlongAxis(aabb, 1, impulse);
    const vertRepulsion = collisionAlongAxis(collisionIndex, aabb, impulse, 1);
    impulse[1] += vertRepulsion;
    if (vertRepulsion !== 0) {
      velocity[1] = 0;
    }

    return { impulse, velocity };
  };
}

// Truncates move that violates a grounded constraint.
export function groundedConstraint(index: GroundedIndex): Constraint {
  return (body: DeepReadonly<Body>, move: DeepReadonly<Movement>) => {
    if (index(shiftAABB(body.aabb, move.impulse))) {
      return { impulse: [...move.impulse], velocity: [...move.velocity] };
    } else {
      return { impulse: [0, 0, 0], velocity: [0, 0, 0] };
    }
  };
}

// Freezes body in the Y direction.
export function frozenConstraintY(): Constraint {
  return (body: DeepReadonly<Body>, move: DeepReadonly<Movement>) => ({
    impulse: [move.impulse[0], 0, move.impulse[2]],
    velocity: [move.velocity[0], 0, move.velocity[2]],
  });
}
