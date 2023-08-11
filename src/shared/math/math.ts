export function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

export function absMin(x: number, y: number) {
  return Math.abs(x) < Math.abs(y) ? x : y;
}

export function absMax(x: number, y: number) {
  return Math.abs(x) > Math.abs(y) ? x : y;
}

export function absRatio(x: number, y: number) {
  return Math.abs(x) / Math.abs(y);
}

export function sameSign(x: number, y: number) {
  return x * y >= 0;
}

export function lerp(start: number, end: number, s: number) {
  return start + s * (end - start);
}
