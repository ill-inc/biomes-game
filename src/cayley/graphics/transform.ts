import type { Array2 } from "@/cayley/numerics/arrays";
import { ArrayExpr } from "@/cayley/numerics/arrays";
import type { Coord3, Coord4 } from "@/cayley/numerics/shapes";
import { assert } from "@/cayley/numerics/util";

export type Transform = [Coord4, Coord4, Coord4, Coord4];
export type Quaternion = Coord4;

export function identity(): Transform {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

export function scale([x, y, z]: Coord3): Transform {
  return [
    [x, 0, 0, 0],
    [0, y, 0, 0],
    [0, 0, z, 0],
    [0, 0, 0, 1],
  ];
}

export function translation([x, y, z]: Coord3): Transform {
  return [
    [1, 0, 0, x],
    [0, 1, 0, y],
    [0, 0, 1, z],
    [0, 0, 0, 1],
  ];
}

export function rotation([q0, q1, q2, q3]: Quaternion): Transform {
  const r00 = 2 * (q3 * q3 + q0 * q0) - 1;
  const r01 = 2 * (q0 * q1 - q3 * q2);
  const r02 = 2 * (q0 * q2 + q3 * q1);

  const r10 = 2 * (q0 * q1 + q3 * q2);
  const r11 = 2 * (q3 * q3 + q1 * q1) - 1;
  const r12 = 2 * (q1 * q2 - q3 * q0);

  const r20 = 2 * (q0 * q2 - q3 * q1);
  const r21 = 2 * (q1 * q2 + q3 * q0);
  const r22 = 2 * (q3 * q3 + q2 * q2) - 1;

  return [
    [r00, r01, r02, 0],
    [r10, r11, r12, 0],
    [r20, r21, r22, 0],
    [0, 0, 0, 1],
  ];
}

export function affine(s: Coord3, r: Quaternion, t: Coord3): Transform {
  const R = rotation(r);
  return [
    [s[0] * R[0][0], s[1] * R[0][1], s[2] * R[0][2], t[0]],
    [s[0] * R[1][0], s[1] * R[1][1], s[2] * R[1][2], t[1]],
    [s[0] * R[2][0], s[1] * R[2][1], s[2] * R[2][2], t[2]],
    [0, 0, 0, 1],
  ];
}

export function identityQuaterion(): Quaternion {
  return [0, 0, 0, 1];
}

export function combineQuaternion(a: Quaternion, b: Quaternion): Quaternion {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function randomQuaterion(rng: () => number = Math.random): Quaternion {
  // From http://planning.cs.uiuc.edu/node198.html,
  const u = rng();
  const v = rng();
  const w = rng();
  return [
    Math.sqrt(1 - u) * Math.sin(2 * Math.PI * v),
    Math.sqrt(1 - u) * Math.cos(2 * Math.PI * v),
    Math.sqrt(u) * Math.sin(2 * Math.PI * w),
    Math.sqrt(u) * Math.cos(2 * Math.PI * w),
  ];
}

export function axisAngleQuaternion(axis: Coord3, angle: number): Quaternion {
  return [
    axis[0] * Math.sin(0.5 * angle),
    axis[1] * Math.sin(0.5 * angle),
    axis[2] * Math.sin(0.5 * angle),
    Math.cos(0.5 * angle),
  ];
}

export function applyTransform(positions: Array2<"F32">, transform: Transform) {
  assert(positions.shape[1] === 3);

  const x = positions.slice(":,0").view();
  const y = positions.slice(":,1").view();
  const z = positions.slice(":,2").view();

  // Multiply by each row of transform to produce each output coordinate.
  let out = ArrayExpr.fill("F32", positions.shape);
  for (let i = 0; i < 3; i += 1) {
    const c0 = x.mul(transform[i][0]);
    const c1 = y.mul(transform[i][1]);
    const c2 = z.mul(transform[i][2]);
    const c3 = transform[i][3];
    out = out.merge(`:,${i}`, c0.add(c1).add(c2).add(c3));
  }

  return out.eval();
}
