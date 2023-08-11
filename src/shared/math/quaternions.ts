import { mul, normalizev } from "@/shared/math/linear";
import type { Mat4, Vec3 } from "@/shared/math/types";

// Great reference:
//   http://www.sci.utah.edu/~jmk/papers/Quaternions.pdf

// The array indices respectively correspond to the bases [1, i, j, k].
export type Quaternion = [number, number, number, number];

// All angles are specified in radians.
export type AxisAngle = { angle: number; axis: Vec3 };
export type EulerAngles = { roll: number; pitch: number; yaw: number };

export const quatIdentity: Quaternion = [1, 0, 0, 0];

export function quatDot(a: Quaternion, b: Quaternion): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

export function quatNormalize(q: Quaternion): Quaternion {
  const lengthInv =
    1 / Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  return [
    q[0] * lengthInv,
    q[1] * lengthInv,
    q[2] * lengthInv,
    q[3] * lengthInv,
  ];
}

export function quatFromAxisAngle(aa: AxisAngle): Quaternion {
  const normalizedAxis = normalizev(aa.axis);
  return [
    Math.cos(0.5 * aa.angle),
    ...mul(Math.sin(0.5 * aa.angle), normalizedAxis),
  ];
}

export function quatToAxisAngle(q: Quaternion): AxisAngle {
  const cosAngle = Math.max(-1, Math.min(1, q[0]));
  const angle = Math.acos(cosAngle) * 2;

  const axisDenom = Math.sin(0.5 * angle);
  if (axisDenom === 0 || (q[1] === 0 && q[2] === 0 && q[3] === 0)) {
    return { angle, axis: [1, 0, 0] };
  }

  return {
    angle,
    axis: mul(1 / axisDenom, [q[1], q[2], q[3]]),
  };
}

export function quatToMatrix(q: Quaternion): Mat4 {
  const q0 = q[0];
  const q0Sq = q0 * q0;
  const q1 = q[1];
  const q2 = q[2];
  const q3 = q[3];

  const m00 = 2 * (q0Sq + q1 * q1) - 1;
  const m01 = 2 * (q1 * q2 - q0 * q3);
  const m02 = 2 * (q1 * q3 + q0 * q2);
  const m03 = 0;

  const m10 = 2 * (q1 * q2 + q0 * q3);
  const m11 = 2 * (q0Sq + q2 * q2) - 1;
  const m12 = 2 * (q2 * q3 - q0 * q1);
  const m13 = 0;

  const m20 = 2 * (q1 * q3 - q0 * q2);
  const m21 = 2 * (q2 * q3 + q0 * q1);
  const m22 = 2 * (q0Sq + q3 * q3) - 1;
  const m23 = 0;

  const m30 = 0;
  const m31 = 0;
  const m32 = 0;
  const m33 = 1;

  return [
    m00,
    m01,
    m02,
    m03,
    m10,
    m11,
    m12,
    m13,
    m20,
    m21,
    m22,
    m23,
    m30,
    m31,
    m32,
    m33,
  ];
}

export function quatFromEuler(e: EulerAngles): Quaternion {
  // This could be much more efficient if necessary, but leaving it like this
  // for now because it's easy to understand.
  const r = quatFromAxisAngle({ axis: [1, 0, 0], angle: e.roll });
  const p = quatFromAxisAngle({ axis: [0, 1, 0], angle: e.pitch });
  const y = quatFromAxisAngle({ axis: [0, 0, 1], angle: e.yaw });
  const result = quatMul(y, quatMul(p, r));
  return result;
}

export function quatToEuler(q: Quaternion): EulerAngles {
  // See https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles#Quaternion_to_Euler_angles_conversion for reference.

  // roll (x-axis rotation)
  const sinrCosp = 2 * (q[0] * q[1] + q[2] * q[3]);
  const cosrCosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  // pitch (y-axis rotation)
  const sinp = 2 * (q[0] * q[2] - q[3] * q[1]);
  const pitch =
    Math.abs(sinp) >= 1 ? (Math.PI / 2) * Math.sign(sinp) : Math.asin(sinp);

  // yaw (z-axis rotation)
  const sinyCosp = 2 * (q[0] * q[3] + q[1] * q[2]);
  const cosyCosp = 1 - 2 * (q[2] * q[2] + q[3] * q[3]);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return { roll, pitch, yaw };
}

// Similar to quaternion multiplication, this effectively composes the
// encoded rotation.
export function quatMul(a: Quaternion, b: Quaternion): Quaternion {
  const q0 = a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3];
  const q1 = a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2];
  const q2 = a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1];
  const q3 = a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0];
  return [q0, q1, q2, q3];
}

export function quatConjugate(a: Quaternion): Quaternion {
  // For unit quaternions, this is the inverse of the quaternion, and equivalent
  // to a^(-1).
  return [a[0], -a[1], -a[2], -a[3]];
}

// Returns q^x
export function quatPow(q: Quaternion, x: number): Quaternion {
  const axisAngle = quatToAxisAngle(q);
  return quatFromAxisAngle({
    axis: axisAngle.axis,
    angle: axisAngle.angle * x,
  });
}

export function quatNeg(q: Quaternion): Quaternion {
  return [-q[0], -q[1], -q[2], -q[3]];
}

function scalarMult(s: number, q: Quaternion): Quaternion {
  return [s * q[0], s * q[1], s * q[2], s * q[3]];
}

function add(a: Quaternion, b: Quaternion): Quaternion {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

export function quatSlerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
  // Make sure that we follow the shortest (of the two possible) path.
  let dot = quatDot(a, b);
  if (dot < 0) {
    a = quatNeg(a);
    dot = -dot;
  }
  const theta = Math.acos(dot);
  const invSinTheta = 1 / Math.sin(theta);

  return quatNormalize(
    add(
      scalarMult(Math.sin((1 - t) * theta) * invSinTheta, a),
      scalarMult(Math.sin(t * theta) * invSinTheta, b)
    )
  );
}
