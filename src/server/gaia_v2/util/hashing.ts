import type { ReadonlyVec3 } from "@/shared/math/types";

function randomHash(x: number) {
  x ^= x >> 16;
  x *= 0x7feb352d;
  x ^= x >> 15;
  x *= 0x846ca68b;
  x ^= x >> 16;
  return x;
}

// Same as the version in C++
export function positionHash([x, y, z]: ReadonlyVec3) {
  return randomHash(x + randomHash(y + randomHash(z)));
}
