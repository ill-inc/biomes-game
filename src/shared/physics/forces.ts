import {
  add,
  cross,
  normalizev,
  scale,
  shiftAABB,
  zeroVector,
} from "@/shared/math/linear";
import { absMax, absMin } from "@/shared/math/math";
import type { AABB, Vec3 } from "@/shared/math/types";
import type { Body, CollisionIndex, Force } from "@/shared/physics/types";
import { intersecting, viewVector, yawVector } from "@/shared/physics/utils";
import { clamp } from "lodash";

export function gravityForce(k: number): Force {
  return (dt) => [0, -k * dt, 0];
}

export function frictionForce(k: number): Force {
  // TODO: This force shouldn't be proportional to the speed.
  return (dt, { velocity: [x, _, z] }) =>
    scale(-Math.min(1, k * dt), [x, 0, z]);
}

export function airResistanceForce(k: number): Force {
  return (dt, { velocity }) => scale(-Math.min(1, k * dt), velocity);
}

export function escapeForce(
  k: number,
  index: CollisionIndex,
  aabb: AABB
): Force {
  return (dt) => {
    // Compute maximum distance to move in each direction to escape collision.
    let [x0, x1] = [0, 0];
    let [y0, y1] = [0, 0];
    let [z0, z1] = [0, 0];
    index(aabb, (hit) => {
      x0 = absMax(x0, hit[0][0] - aabb[1][0]);
      x1 = absMax(x1, hit[1][0] - aabb[0][0]);
      y0 = absMax(y0, hit[0][1] - aabb[1][1]);
      y1 = absMax(y1, hit[1][1] - aabb[0][1]);
      z0 = absMax(z0, hit[0][2] - aabb[1][2]);
      z1 = absMax(z1, hit[1][2] - aabb[0][2]);
    });

    // Helper routines to test for an intersection.
    const intersectX = (x: number) => {
      return intersecting(index, shiftAABB(aabb, [x, 0, 0]));
    };
    const intersectY = (y: number) => {
      return intersecting(index, shiftAABB(aabb, [0, y, 0]));
    };
    const intersectZ = (z: number) => {
      return intersecting(index, shiftAABB(aabb, [0, 0, z]));
    };

    // Of these directions, do the minimum that avoids collision or default up.
    let min = Infinity;
    let force: Vec3 = [0, 1, 0];
    if (absMin(x0, min) == x0 && !intersectX(x0)) {
      force = [-1, 0, 0];
      min = x0;
    }
    if (absMin(x1, min) == x1 && !intersectX(x1)) {
      force = [1, 0, 0];
      min = x1;
    }
    if (absMin(y0, min) == y0 && !intersectY(y0)) {
      force = [0, -1, 0];
      min = y0;
    }
    if (absMin(y1, min) == y1 && !intersectY(y1)) {
      force = [0, 1, 0];
      min = y1;
    }
    if (absMin(z0, min) == z0 && !intersectZ(z0)) {
      force = [0, 0, -1];
      min = z0;
    }
    if (absMin(z1, min) == z1 && !intersectZ(z1)) {
      force = [0, 0, 1];
      min = z1;
    }

    return scale(dt * k, force);
  };
}

export function verticalForce(k: number): Force {
  return () => [0, k, 0];
}

export function walkingForce(
  k: number,
  yaw: number,
  forward: -1 | 0 | 1,
  lateral: -1 | 0 | 1
): Force {
  return (dt) =>
    scale(
      dt * k,
      normalizev(
        add(
          scale(forward, yawVector(yaw)),
          scale(lateral, yawVector(yaw - 0.5 * Math.PI))
        )
      )
    );
}

export function forwardWalkingForce(k: number, yaw: number): Force {
  return (dt) => scale(dt * k, yawVector(yaw));
}

export function lateralWalkingForce(k: number, yaw: number): Force {
  return (dt) => scale(dt * k, cross(yawVector(yaw), [0, 1, 0]));
}

export function flyingForce(
  k: number,
  pitch: number,
  yaw: number,
  forward: -1 | 0 | 1,
  lateral: -1 | 0 | 1
): Force {
  return (dt) =>
    scale(
      dt * k,
      normalizev(
        add(
          scale(forward, viewVector(pitch, yaw)),
          scale(lateral, yawVector(yaw - 0.5 * Math.PI))
        )
      )
    );
}

export function swimmingForce(
  k: number,
  pitch: number,
  yaw: number,
  forward: -1 | 0 | 1,
  lateral: -1 | 0 | 1,
  waterDepth: number,
  swimmingPitchOffset: number,
  swimmingSpeed: number
): Force {
  // Make going laterally, backwards, up, and down slower.
  const lateralSuppressionFactor = 0.3;
  const backwardsSuppressionFactor = forward === -1 ? 0.5 : 1;
  const pitchSuppressionFactor = 1 - 0.6 * clamp(Math.abs(pitch), 0, 1);

  // The pitch required to swim exactly horizontally.
  const swimHorizontalPitch = 0;
  // Pitch is limited when player is near the surface of the water so it
  // is less jittery near the surface of the water.
  const effectivePitch =
    waterDepth < 0.7
      ? Math.min(pitch + swimmingPitchOffset, swimHorizontalPitch)
      : pitch + swimmingPitchOffset;

  const forwardComponent = scale(
    forward * backwardsSuppressionFactor * pitchSuppressionFactor,
    viewVector(effectivePitch, yaw)
  );

  const lateralComponent = scale(
    lateral * lateralSuppressionFactor,
    yawVector(yaw - 0.5 * Math.PI)
  );

  return (dt) =>
    scale(dt * k * swimmingSpeed, add(forwardComponent, lateralComponent));
}

export function forwardFlyingForce(
  k: number,
  pitch: number,
  yaw: number
): Force {
  return (dt) => scale(dt * k, viewVector(pitch, yaw));
}

export function toForce(v: Vec3): Force {
  return () => v;
}

export const nullForce: Force = () => zeroVector;

export function addForce(force1: Force, force2: Force): Force {
  return (dt: number, body: Readonly<Body>) => {
    return add(force1(dt, body), force2(dt, body));
  };
}

// Scale a force in the xz-plane.
export const scaleForceXZ = (k: number, force: Force): Force => {
  return (dt, body) => {
    const originalForce = force(dt, body);
    return [originalForce[0] * k, originalForce[1], originalForce[2] * k];
  };
};
