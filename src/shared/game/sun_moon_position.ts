import type { Vec3 } from "@/shared/math/types";

const SUN_AZIMUTH = 0.25 * Math.PI;
export const SECONDS_PER_DAY = 60 * 60; // 1 hour
const MOON_AZIMUTH = SUN_AZIMUTH;
const SECONDS_PER_MOON_REVOLUTION = 60 * 65; // 65 min

const SUN_DURATIONS = [
  [0.1, 0.2],
  [0.1, 0.05],
  [0.1, 0.2],
  [0.4, 0.1],
  [0.1, 0.2],
  [0.1, 0.05],
  [0.1, 0.2],
];

function sunDilation(time: number) {
  let ret = 0.0;
  for (const [end, dur] of SUN_DURATIONS) {
    if (time > 0) {
      ret += end * Math.min(1.0, time / dur);
      time -= dur;
    }
  }
  return ret;
}

// Angle in radians. 0 means the sun is overhead, PI is the middle of the night.
export function sunInclination(
  secondsSinceEpoch: number,
  applySunDilation: boolean = true
): number {
  const t = secondsSinceEpoch / SECONDS_PER_DAY + 0.5;
  if (applySunDilation) {
    return 2 * Math.PI * sunDilation(t % 1.0);
  } else {
    return 2 * Math.PI * (t % 1.0);
  }
}

export function isDayTime(sunInclination: number): boolean {
  return Math.cos(sunInclination) > 0;
}

export function sunDirection(sunInclination: number): Vec3 {
  return [
    Math.cos(SUN_AZIMUTH) * Math.sin(sunInclination),
    Math.cos(sunInclination),
    Math.sin(SUN_AZIMUTH) * Math.sin(sunInclination),
  ];
}

export function timeOfDay(secondsSinceEpoch: number): number {
  const sun = sunInclination(secondsSinceEpoch);
  // 0 = noon, PI = midnight. Remap to 0, 1 = midnight, 0.5 = noon.
  return ((sun / Math.PI + 1) / 2) % 1;
}

export function moonInclination(secondsSinceEpoch: number): number {
  const t = secondsSinceEpoch / SECONDS_PER_MOON_REVOLUTION;
  return 2 * Math.PI * sunDilation(t % 1.0); // Uses the same duration as the sun.
}

export function moonDirection(moonInclination: number): number[] {
  return [
    Math.cos(MOON_AZIMUTH) * Math.sin(moonInclination),
    Math.cos(moonInclination),
    Math.sin(MOON_AZIMUTH) * Math.sin(moonInclination),
  ];
}

// Direction on the offset circle that occludes part of the moon's surface.
const OFFSET = 0.01;
export function moonDirectionOffset(moonDirection: number[]): number[] {
  return [
    (moonDirection[0] / Math.cos(MOON_AZIMUTH)) * Math.cos(MOON_AZIMUTH),
    moonDirection[1],
    (moonDirection[2] / Math.sin(MOON_AZIMUTH)) * Math.sin(MOON_AZIMUTH) +
      OFFSET,
  ];
}
