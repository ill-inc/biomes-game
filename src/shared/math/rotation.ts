import type { Vec2f } from "@/shared/ecs/gen/types";
import { modulo } from "@/shared/math/linear";
import type { ReadonlyVec2 } from "@/shared/math/types";

// Rotation can also mean a discrete direction where something is facing horizontally.
export enum Rotation {
  Z_NEG = 0,
  X_NEG = 1,
  Z_POS = 2,
  X_POS = 3,
}

export function normalizeRotation(n: number | undefined): Rotation {
  return n ? modulo(n, 4) : 0;
}

export function rotationToOrientation(rotation: Rotation | undefined): Vec2f {
  return [0, Math.PI * 0.5 * normalizeRotation(rotation)];
}

export function orientationToRotation(
  orientation: ReadonlyVec2 | undefined
): Rotation {
  if (!orientation) {
    return 0;
  }
  return normalizeRotation(Math.round(orientation[1] / (Math.PI * 0.5)));
}

export function normalizeAngle(angle: number, center = Math.PI) {
  return (
    angle - 2 * Math.PI * Math.floor((angle + Math.PI - center) / (2 * Math.PI))
  );
}
