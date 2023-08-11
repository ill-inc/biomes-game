// All units are in radians.

import type { ReadonlyVec2, Vec2 } from "@/shared/math/types";
import { clamp } from "lodash";

// Returns a number in [0, 2pi].
export function normalizeAngle(x: number) {
  const xModTwoPi = x % (Math.PI * 2);
  return xModTwoPi + (x < 0 ? Math.PI * 2 : 0);
}

// Returns a value between [-PI, PI] such that y + diffRadians(x, y) = x.
// There are two possibilities, the one with the smallest magnitude is returned.
export function diffAngle(x: number, y: number) {
  const diff = normalizeAngle(x - y);
  return diff > Math.PI ? diff - 2 * Math.PI : diff;
}

export function degToRad(deg: number) {
  return (deg / 180) * Math.PI;
}

export function radToDeg(rad: number) {
  return (rad / Math.PI) * 180;
}

export function normalizeOrientation(u: ReadonlyVec2): Vec2 {
  return [clamp(u[0], -Math.PI / 2, Math.PI / 2), normalizeAngle(u[1])];
}
