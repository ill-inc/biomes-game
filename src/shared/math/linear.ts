import type { Reflect } from "@/shared/asset_defs/shapes";
import type {
  ReadonlyVec3f,
  ReadonlyVec4i,
  Vec3f,
} from "@/shared/ecs/gen/types";
import { absMax as absMaxScalar } from "@/shared/math/math";
import type {
  AABB,
  AABB2,
  ConvexPolytope,
  Mat4,
  ReadonlyAABB,
  ReadonlyAABB2,
  ReadonlyConvexPolytope,
  ReadonlyMat4,
  ReadonlyPlane,
  ReadonlyVec2,
  ReadonlyVec3,
  ReadonlyVec4,
  Sphere,
  Vec2,
  Vec3,
  Vec4,
} from "@/shared/math/types";
import type { Optional } from "@/shared/util/type_helpers";
import { Dir } from "@/shared/wasm/types/common";
import { ok } from "assert";
import { isInteger, random, values } from "lodash";
import * as THREE from "three";

export const EPSILON = 0.0001;
export const zeroVector: Vec3 = [0, 0, 0];
export const squareVector: Vec3 = [1, 1, 1];

export function add(u: ReadonlyVec3, v: ReadonlyVec3): Vec3 {
  return [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
}

export function interp(start: ReadonlyVec3, end: ReadonlyVec3, s: number) {
  return add(start, scale(s, sub(end, start)));
}

export function interp2(start: ReadonlyVec2, end: ReadonlyVec2, s: number) {
  return add2(start, scale2(s, sub2(end, start)));
}

export function sub(u: ReadonlyVec3, v: ReadonlyVec3): Vec3 {
  return [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
}

export function add2(u: ReadonlyVec2, v: ReadonlyVec2): Vec2 {
  return [u[0] + v[0], u[1] + v[1]];
}

export function sub2(u: ReadonlyVec2, v: ReadonlyVec2): Vec2 {
  return [u[0] - v[0], u[1] - v[1]];
}

export function rot2(v: ReadonlyVec2, angle: number): Vec2 {
  return [
    v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
    v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
  ];
}

export function neg(u: ReadonlyVec3): Vec3 {
  return [-u[0], -u[1], -u[2]];
}

export function mul(v: number, u: ReadonlyVec3): Vec3 {
  return [u[0] * v, u[1] * v, u[2] * v];
}

export function mul2(v: number, u: ReadonlyVec2): Vec2 {
  return [u[0] * v, u[1] * v];
}

export function div(v: number, u: ReadonlyVec3): Vec3 {
  return [u[0] / v, u[1] / v, u[2] / v];
}

export function div2(v: number, u: ReadonlyVec2): Vec2 {
  return [u[0] / v, u[1] / v];
}

export function xzProject(v: ReadonlyVec3): Vec2 {
  return [v[0], v[2]];
}

export function xzUnproject(v: ReadonlyVec2, y = 0): Vec3 {
  return [v[0], y, v[1]];
}

export function truncate(v: ReadonlyVec3): Vec3 {
  return lengthSq(v) < 1e-8 ? [0, 0, 0] : [...v];
}

export function equals(u: ReadonlyVec3, v: ReadonlyVec3) {
  return u[0] == v[0] && u[1] == v[1] && u[2] == v[2];
}

export function approxEquals(u: ReadonlyVec3, v: ReadonlyVec3) {
  return (
    Math.abs(u[0] - v[0]) < EPSILON &&
    Math.abs(u[1] - v[1]) < EPSILON &&
    Math.abs(u[2] - v[2]) < EPSILON
  );
}

export function approxEquals2(u: ReadonlyVec2, v: ReadonlyVec2) {
  return Math.abs(u[0] - v[0]) < EPSILON && Math.abs(u[1] - v[1]) < EPSILON;
}

export function clampv(
  v: ReadonlyVec3,
  min: ReadonlyVec3,
  max: ReadonlyVec3
): Vec3 {
  return [
    Math.max(min[0], Math.min(max[0], v[0])),
    Math.max(min[1], Math.min(max[1], v[1])),
    Math.max(min[2], Math.min(max[2], v[2])),
  ];
}

export function clampv2(
  v: ReadonlyVec2,
  min: ReadonlyVec2,
  max: ReadonlyVec2
): Vec2 {
  return [
    Math.max(min[0], Math.min(max[0], v[0])),
    Math.max(min[1], Math.min(max[1], v[1])),
  ];
}

export function min2(a: ReadonlyVec2, b: ReadonlyVec2) {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1])] as Vec2;
}

export function min(a: ReadonlyVec3, b: ReadonlyVec3) {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.min(a[2], b[2]),
  ] as Vec3;
}

export function max2(a: ReadonlyVec2, b: ReadonlyVec2) {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1])] as Vec2;
}

export function max(a: ReadonlyVec3, b: ReadonlyVec3) {
  return [
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
    Math.max(a[2], b[2]),
  ] as Vec3;
}

// return v + v .* s
export function addScaled(v: Vec3, s: Vec3): Vec3 {
  return [v[0] + v[0] * s[0], v[1] + v[1] * s[1], v[2] + v[2] * s[2]];
}

export function isZero(v: Vec3): boolean {
  return v[0] === 0 && v[1] === 0 && v[2] === 0;
}
export function isZero2(v: Vec2): boolean {
  return v[0] === 0 && v[1] === 0;
}

export function randomInAABB(box: ReadonlyAABB, floating?: boolean): Vec3 {
  return [
    random(box[0][0], box[1][0], floating),
    random(box[0][1], box[1][1], floating),
    random(box[0][2], box[1][2], floating),
  ];
}

export function roundAABB(a: ReadonlyAABB): AABB {
  return [round(a[0]), round(a[1])];
}

export function unionAABB(a: ReadonlyAABB, b: ReadonlyAABB): AABB {
  return [
    min(min(a[0], b[0]), min(a[1], b[1])),
    max(max(a[0], b[0]), max(a[1], b[1])),
  ];
}

export function unionAABB2(a: ReadonlyAABB2, b: ReadonlyAABB2): AABB2 {
  return [
    min2(min2(a[0], b[0]), min2(a[1], b[1])),
    max2(max2(a[0], b[0]), max2(a[1], b[1])),
  ];
}

export function xzAABB(a: ReadonlyAABB): [Vec2, Vec2] {
  return [
    [a[0][0], a[0][2]],
    [a[1][0], a[1][2]],
  ];
}

export function sizeAABB(aabb: ReadonlyAABB): Vec3 {
  return [
    aabb[1][0] - aabb[0][0],
    aabb[1][1] - aabb[0][1],
    aabb[1][2] - aabb[0][2],
  ];
}

export function sizeAABB2(aabb: ReadonlyAABB2): Vec2 {
  return [aabb[1][0] - aabb[0][0], aabb[1][1] - aabb[0][1]];
}

export function centerAABB(aabb: ReadonlyAABB): Vec3 {
  return [
    aabb[0][0] + (aabb[1][0] - aabb[0][0]) / 2,
    aabb[0][1] + (aabb[1][1] - aabb[0][1]) / 2,
    aabb[0][2] + (aabb[1][2] - aabb[0][2]) / 2,
  ];
}

export function centerAABB2(aabb: ReadonlyAABB2): Vec2 {
  return [
    aabb[0][0] + (aabb[1][0] - aabb[0][0]) / 2,
    aabb[0][1] + (aabb[1][1] - aabb[0][1]) / 2,
  ];
}

export function sphereFromAABB(aabb: ReadonlyAABB): Sphere {
  const [w, h, d] = sizeAABB(aabb);
  return {
    center: [aabb[0][0] + w / 2, aabb[0][1] + h / 2, aabb[0][2] + d / 2],
    radius: Math.sqrt((w ** 2 + h ** 2 + d ** 2) / 4),
  };
}

export function centerAABBXZ(aabb: ReadonlyAABB): Vec3 {
  return [
    aabb[0][0] + (aabb[1][0] - aabb[0][0]) / 2,
    aabb[0][1],
    aabb[0][2] + (aabb[1][2] - aabb[0][2]) / 2,
  ];
}

// Inclusive check to see if a bounding box contains a point.
export function containsAABB(aabb: ReadonlyAABB, point: ReadonlyVec3) {
  return (
    aabb[0][0] <= point[0] &&
    aabb[1][0] > point[0] &&
    aabb[0][1] <= point[1] &&
    aabb[1][1] > point[1] &&
    aabb[0][2] <= point[2] &&
    aabb[1][2] > point[2]
  );
}

export function aabbContainsAABB(container: ReadonlyAABB, aabb: ReadonlyAABB) {
  return containsAABB(container, aabb[0]) && containsAABB(container, aabb[1]);
}

export function inclusiveContainsAABB(aabb: ReadonlyAABB, point: ReadonlyVec3) {
  return (
    aabb[0][0] <= point[0] &&
    aabb[1][0] >= point[0] &&
    aabb[0][1] <= point[1] &&
    aabb[1][1] >= point[1] &&
    aabb[0][2] <= point[2] &&
    aabb[1][2] >= point[2]
  );
}

export function inclusiveAabbContainsAABB(
  container: ReadonlyAABB,
  aabb: ReadonlyAABB
) {
  return (
    inclusiveContainsAABB(container, aabb[0]) &&
    inclusiveContainsAABB(container, aabb[1])
  );
}

// Check whether two AABBs intersect.
export function intersectsAABB(a: ReadonlyAABB, b: ReadonlyAABB) {
  return (
    a[0][0] < b[1][0] &&
    b[0][0] < a[1][0] &&
    a[0][1] < b[1][1] &&
    b[0][1] < a[1][1] &&
    a[0][2] < b[1][2] &&
    b[0][2] < a[1][2]
  );
}

export function distSqToAABB(point: ReadonlyVec3, aabb: ReadonlyAABB): number {
  const min = aabb[0];
  const max = aabb[1];

  let distanceSq = 0;
  for (let i = 0; i < 3; i++) {
    if (point[i] < min[i]) {
      distanceSq += (point[i] - min[i]) ** 2;
    } else if (point[i] > max[i]) {
      distanceSq += (point[i] - max[i]) ** 2;
    }
  }
  return distanceSq;
}

// Shifts the given AABB by the specified translation vector.
export function shiftAABB(aabb: ReadonlyAABB, shift: ReadonlyVec3): AABB {
  return [add(aabb[0], shift), add(aabb[1], shift)];
}

// Grows a AABB in all dimensions by the specified amount.
export function growAABB(aabb: ReadonlyAABB, grow: number): AABB {
  return [
    [aabb[0][0] - grow, aabb[0][1] - grow, aabb[0][2] - grow],
    [aabb[1][0] + grow, aabb[1][1] + grow, aabb[1][2] + grow],
  ];
}

export function volumeAABB(aabb: ReadonlyAABB): number {
  const size = sizeAABB(aabb);
  return size[0] * size[1] * size[2];
}

// Returns the minimal AABB containing the given points.
export function pointsToAABB(...tail: ReadonlyVec3[]): AABB {
  ok(tail.length > 0);
  const ret: AABB = [[...tail[0]], [...tail[0]]];
  for (const point of tail) {
    ret[0][0] = Math.min(ret[0][0], point[0]);
    ret[0][1] = Math.min(ret[0][1], point[1]);
    ret[0][2] = Math.min(ret[0][2], point[2]);
    ret[1][0] = Math.max(ret[1][0], point[0]);
    ret[1][1] = Math.max(ret[1][1], point[1]);
    ret[1][2] = Math.max(ret[1][2], point[2]);
  }
  return ret;
}

// Returns the minimal AABB containing the given points.
export function pointsToAABB2(...tail: ReadonlyVec2[]): AABB2 {
  ok(tail.length > 0);
  const ret: AABB2 = [[...tail[0]], [...tail[0]]];
  for (const point of tail) {
    ret[0][0] = Math.min(ret[0][0], point[0]);
    ret[0][1] = Math.min(ret[0][1], point[1]);
    ret[1][0] = Math.max(ret[1][0], point[0]);
    ret[1][1] = Math.max(ret[1][1], point[1]);
  }
  return ret;
}

// Returns the minimal AABB containing the given voxels.
export function voxelsToAABB(...tail: ReadonlyVec3[]): AABB {
  ok(tail.length > 0);
  const ret: AABB = [[...tail[0]], add(tail[0], [1, 1, 1])];
  for (const voxel of tail) {
    ret[0][0] = Math.min(ret[0][0], voxel[0]);
    ret[0][1] = Math.min(ret[0][1], voxel[1]);
    ret[0][2] = Math.min(ret[0][2], voxel[2]);
    ret[1][0] = Math.max(ret[1][0], voxel[0] + 1);
    ret[1][1] = Math.max(ret[1][1], voxel[1] + 1);
    ret[1][2] = Math.max(ret[1][2], voxel[2] + 1);
  }
  return ret;
}

// Returns an AABB from the given point (its center) and size vector.
export function centerAndSizeToAABB(
  center: ReadonlyVec3,
  size: ReadonlyVec3
): AABB {
  return [add(center, mul(-0.5, size)), add(center, mul(0.5, size))];
}

export function centerAndSideLengthToAABB(
  center: ReadonlyVec3,
  sideLength: number
): AABB {
  const halfSideLength = sideLength / 2;
  return [
    sub(center, [halfSideLength, halfSideLength, halfSideLength]),
    add(center, [halfSideLength, halfSideLength, halfSideLength]),
  ];
}

// Returns an AABB from the given point (its anchor) and size vector. The anchor
// point is position at the center in x and z and bottom in y.
export function anchorAndSizeToAABB(
  [x, y, z]: ReadonlyVec3,
  [w, h, d]: ReadonlyVec3
): AABB {
  return [
    sub([x, y, z], [0.5 * w, 0, 0.5 * d]),
    add([x, y, z], [0.5 * w, h, 0.5 * d]),
  ];
}

// Returns a vector that gives the offset of a containee bounding box from a
// container bounding box. If the container completely contains the bounding
// box, it will return a zero vector.
export function offsetFromContainerAABB(
  containee: ReadonlyAABB,
  container: ReadonlyAABB
): Vec3 {
  return [
    Math.min(containee[0][0] - container[0][0], 0) +
      Math.max(containee[1][0] - container[1][0], 0),
    Math.min(containee[0][1] - container[0][1], 0) +
      Math.max(containee[1][1] - container[1][1], 0),
    Math.min(containee[0][2] - container[0][2], 0) +
      Math.max(containee[1][2] - container[1][2], 0),
  ];
}

// Returns the nearest point within the AABB to the given point.
export function nearestPointAABB([x, y, z]: ReadonlyVec3, aabb: ReadonlyAABB) {
  const dx = Math.max(aabb[0][0] - x, 0, x - aabb[1][0]);
  const dy = Math.max(aabb[0][1] - y, 0, y - aabb[1][1]);
  const dz = Math.max(aabb[0][2] - z, 0, z - aabb[1][2]);
  return add([x, y, z], [dx, dy, dz]);
}

export function cornersAABB(aabb: ReadonlyAABB) {
  return Array<Vec3>(
    [aabb[0][0], aabb[0][1], aabb[0][2]],
    [aabb[1][0], aabb[0][1], aabb[0][2]],
    [aabb[0][0], aabb[1][1], aabb[0][2]],
    [aabb[0][0], aabb[0][1], aabb[1][2]],
    [aabb[0][0], aabb[1][1], aabb[1][2]],
    [aabb[1][0], aabb[0][1], aabb[1][2]],
    [aabb[1][0], aabb[1][1], aabb[0][2]],
    [aabb[1][0], aabb[1][1], aabb[1][2]]
  );
}

// Gives the aabb for the solid that is the intersection of box1 and box2.
export function getIntersectionAABB(box1: AABB, box2: AABB): Optional<AABB> {
  if (!intersectsAABB(box1, box2)) {
    return undefined;
  }

  return [
    [
      Math.max(box1[0][0], box2[0][0]),
      Math.max(box1[0][1], box2[0][1]),
      Math.max(box1[0][2], box2[0][2]),
    ],
    [
      Math.min(box1[1][0], box2[1][0]),
      Math.min(box1[1][1], box2[1][1]),
      Math.min(box1[1][2], box2[1][2]),
    ],
  ];
}

export function reflect(u: ReadonlyVec3, reflection: Reflect): Vec3f {
  const ret: Vec3f = [...u];
  if (reflection[0] > 0) {
    ret[0] = -ret[0];
  }
  if (reflection[1] > 0) {
    ret[1] = -ret[1];
  }
  if (reflection[2] > 0) {
    ret[2] = -ret[2];
  }
  return ret;
}

export function dot(u: ReadonlyVec3, v: ReadonlyVec3): number {
  return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

export function dot2(u: ReadonlyVec2, v: ReadonlyVec2): number {
  return u[0] * v[0] + u[1] * v[1];
}

export function lengthSq(u: ReadonlyVec3) {
  return dot(u, u);
}

export function length(u: ReadonlyVec3) {
  return Math.sqrt(lengthSq(u));
}

export function lengthSq2(u: ReadonlyVec2) {
  return dot2(u, u);
}

export function length2(u: ReadonlyVec2) {
  return Math.sqrt(lengthSq2(u));
}

export function distSq(u: ReadonlyVec3, v: ReadonlyVec3) {
  return lengthSq(sub(u, v));
}

export function dist(u: ReadonlyVec3, v: ReadonlyVec3) {
  return length(sub(u, v));
}

export function distManhattan(u: ReadonlyVec3, v: ReadonlyVec3) {
  return Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) + Math.abs(u[2] - v[2]);
}

export function distSq2(u: ReadonlyVec2, v: ReadonlyVec2) {
  return lengthSq2(sub2(u, v));
}

export function dist2(u: ReadonlyVec2, v: ReadonlyVec2) {
  return length2(sub2(u, v));
}

export function scale(s: number, v: ReadonlyVec3): Vec3 {
  return [s * v[0], s * v[1], s * v[2]];
}

export function scale2(s: number, v: ReadonlyVec2): Vec2 {
  return [s * v[0], s * v[1]];
}

export function normalizev(u: ReadonlyVec3) {
  return scale(1 / Math.max(1e-5, length(u)), u);
}

export function normalizev2(u: ReadonlyVec2) {
  return scale2(1 / Math.max(1e-5, length2(u)), u);
}

export function abs(u: ReadonlyVec3): Vec3 {
  return [Math.abs(u[0]), Math.abs(u[1]), Math.abs(u[2])];
}

export function absMax(u: ReadonlyVec3, v: ReadonlyVec3): Vec3 {
  return [
    absMaxScalar(u[0], v[0]),
    absMaxScalar(u[1], v[1]),
    absMaxScalar(u[2], v[2]),
  ];
}

export function mod(u: ReadonlyVec3, value: number): Vec3 {
  return [u[0] % value, u[1] % value, u[2] % value];
}

export function floor(u: ReadonlyVec3): Vec3 {
  return [Math.floor(u[0]), Math.floor(u[1]), Math.floor(u[2])];
}

export function floor2(u: ReadonlyVec2): Vec2 {
  return [Math.floor(u[0]), Math.floor(u[1])];
}

export function round(u: ReadonlyVec3): Vec3 {
  return [Math.round(u[0]), Math.round(u[1]), Math.round(u[2])];
}

export function round2(u: ReadonlyVec2): Vec2 {
  return [Math.round(u[0]), Math.round(u[1])];
}

export function fixed2(u: ReadonlyVec2, digits: number): Vec2 {
  const mul = Math.pow(10, digits);
  return [Math.round(u[0] * mul) / mul, Math.round(u[1] * mul) / mul];
}

export function ceil(u: ReadonlyVec3): Vec3 {
  return [Math.ceil(u[0]), Math.ceil(u[1]), Math.ceil(u[2])];
}

export function cross(
  [a1, a2, a3]: ReadonlyVec3,
  [b1, b2, b3]: ReadonlyVec3
): Vec3 {
  return [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
}

export function boxVertices(v0: ReadonlyVec3, v1: ReadonlyVec3) {
  const [x0, y0, z0] = v0;
  const [x1, y1, z1] = v1;

  const ret = [];
  ret.push(x0, y0, z0);
  ret.push(x1, y0, z0);
  ret.push(x1, y1, z0);
  ret.push(x0, y0, z0);
  ret.push(x1, y1, z0);
  ret.push(x0, y1, z0);

  ret.push(x1, y0, z0);
  ret.push(x1, y0, z1);
  ret.push(x1, y1, z1);
  ret.push(x1, y0, z0);
  ret.push(x1, y1, z1);
  ret.push(x1, y1, z0);

  ret.push(x1, y0, z1);
  ret.push(x0, y0, z1);
  ret.push(x0, y1, z1);
  ret.push(x1, y0, z1);
  ret.push(x0, y1, z1);
  ret.push(x1, y1, z1);

  ret.push(x0, y0, z1);
  ret.push(x0, y0, z0);
  ret.push(x0, y1, z0);
  ret.push(x0, y0, z1);
  ret.push(x0, y1, z1);
  ret.push(x0, y1, z0);

  ret.push(x0, y0, z0);
  ret.push(x1, y0, z0);
  ret.push(x1, y0, z1);
  ret.push(x0, y0, z0);
  ret.push(x1, y0, z1);
  ret.push(x0, y0, z1);

  ret.push(x0, y1, z0);
  ret.push(x1, y1, z1);
  ret.push(x1, y1, z0);
  ret.push(x0, y1, z0);
  ret.push(x0, y1, z1);
  ret.push(x1, y1, z1);
  return ret;
}

export function boxEdgeVertices(v0: ReadonlyVec3, v1: ReadonlyVec3) {
  const [x0, y0, z0] = v0;
  const [x1, y1, z1] = v1;

  const ret = [];
  ret.push(x0, y0, z0);
  ret.push(x1, y0, z0);
  ret.push(x0, y1, z0);
  ret.push(x1, y1, z0);
  ret.push(x0, y0, z1);
  ret.push(x1, y0, z1);
  ret.push(x0, y1, z1);
  ret.push(x1, y1, z1);

  ret.push(x0, y0, z0);
  ret.push(x0, y1, z0);
  ret.push(x1, y0, z0);
  ret.push(x1, y1, z0);
  ret.push(x0, y0, z1);
  ret.push(x0, y1, z1);
  ret.push(x1, y0, z1);
  ret.push(x1, y1, z1);

  ret.push(x0, y0, z0);
  ret.push(x0, y0, z1);
  ret.push(x1, y0, z0);
  ret.push(x1, y0, z1);
  ret.push(x0, y1, z0);
  ret.push(x0, y1, z1);
  ret.push(x1, y1, z0);
  ret.push(x1, y1, z1);
  return ret;
}

export function identm4(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function mulm4(a: Mat4, b: Mat4): Mat4 {
  return [
    a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
    a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
    a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
    a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],

    a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
    a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
    a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
    a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],

    a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
    a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
    a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
    a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],

    a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
    a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
    a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
    a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15],
  ];
}

export function mulm4v4(m: ReadonlyMat4, v: ReadonlyVec4): Vec4 {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
  ];
}

export function makeTranslation([x, y, z]: ReadonlyVec3): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

export function makeScale([x, y, z]: ReadonlyVec3): Mat4 {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

export function makeXRotate(rads: number): Mat4 {
  const cos = Math.cos(rads);
  const sin = Math.sin(rads);
  return [1, 0, 0, 0, 0, cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1];
}

export function makeYRotate(rads: number): Mat4 {
  const cos = Math.cos(rads);
  const sin = Math.sin(rads);
  return [cos, 0, -sin, 0, 0, 1, 0, 0, sin, 0, cos, 0, 0, 0, 0, 1];
}

export function makeZRotate(rads: number): Mat4 {
  const cos = Math.cos(rads);
  const sin = Math.sin(rads);
  return [cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function makeOrthoProjection(
  near: number,
  far: number,
  left: number,
  right: number,
  top: number,
  bottom: number
): Mat4 {
  const xDiff = right - left;
  const yDiff = top - bottom;
  const zDiff = far - near;
  return [
    2 / xDiff,
    0,
    0,
    0,
    0,
    2 / yDiff,
    0,
    0,
    0,
    0,
    // We negate the near and far values to make them right-handed coordinate system values.
    -2 / zDiff,
    0,
    -(right + left) / xDiff,
    -(top + bottom) / yDiff,
    -(far + near) / zDiff,
    1,
  ];
}

// Use the Gribb/Hartmann to extract the frustum planes from the matrix.
// http://www.cs.otago.ac.nz/postgrads/alexis/planeExtraction.pdf
export function frustumToConvexPolytope(m: ReadonlyMat4): ConvexPolytope {
  const planes: ConvexPolytope = [
    // Right
    [-m[3] + m[0], -m[7] + m[4], -m[11] + m[8], m[15] - m[12]],
    // Left
    [-m[3] - m[0], -m[7] - m[4], -m[11] - m[8], m[15] + m[12]],
    // Top
    [-m[3] + m[1], -m[7] + m[5], -m[11] + m[9], m[15] - m[13]],
    // Bottom
    [-m[3] - m[1], -m[7] - m[5], -m[11] - m[9], m[15] + m[13]],
    // Far
    [-m[3] + m[2], -m[7] + m[6], -m[11] + m[10], m[15] - m[14]],
    // Near
    [-m[3] - m[2], -m[7] - m[6], -m[11] - m[10], m[15] + m[14]],
  ];

  // Normalize the plane normals.
  for (const p of planes) {
    const scale = 1 / length(p as unknown as ReadonlyVec3);
    p[0] *= scale;
    p[1] *= scale;
    p[2] *= scale;
    p[3] *= scale;
  }
  return planes;
}

export function intersectHalfSpaceAABB(
  plane: ReadonlyPlane,
  [min, max]: ReadonlyAABB
): boolean {
  // Find the point on the AABB that is furthest in the direction of the plane.
  const x = plane[0] < 0 ? max[0] : min[0];
  const y = plane[1] < 0 ? max[1] : min[1];
  const z = plane[2] < 0 ? max[2] : min[2];

  return pointInHalfSpace(plane, [x, y, z]);
}

export function pointInHalfSpace(
  plane: ReadonlyPlane,
  [x, y, z]: ReadonlyVec3
) {
  return plane[0] * x + plane[1] * y + plane[2] * z - plane[3] <= 0;
}

export function intersectConvexPolytopeAABB(
  polytope: ReadonlyConvexPolytope,
  aabb: ReadonlyAABB
): boolean {
  return polytope.every((p) => intersectHalfSpaceAABB(p, aabb));
}

export function pointInConvexPolytope(
  polytope: ReadonlyConvexPolytope,
  point: ReadonlyVec3
) {
  return polytope.every((p) => pointInHalfSpace(p, point));
}

export function viewProjFrustumIntersectsAABB(
  viewProj: ReadonlyMat4,
  aabb: ReadonlyAABB
) {
  const asConvexPolytope = frustumToConvexPolytope(viewProj);
  return intersectConvexPolytopeAABB(asConvexPolytope, aabb);
}

export function frustumCorners(frustum: ReadonlyMat4): ReadonlyVec3[] {
  const invViewProj = new THREE.Matrix4().fromArray(frustum).invert().toArray();
  return (
    [
      [-1, -1, -1, 1],
      [-1, -1, 1, 1],
      [-1, 1, -1, 1],
      [-1, 1, 1, 1],
      [1, -1, -1, 1],
      [1, -1, 1, 1],
      [1, 1, -1, 1],
      [1, 1, 1, 1],
    ] as const
  ).map((x) => {
    const v4 = mulm4v4(invViewProj, x as Vec4);
    return scale(1 / v4[3], [v4[0], v4[1], v4[2]]) as ReadonlyVec3;
  });
}

export function frustumBoundingSphere(frustum: ReadonlyMat4): Sphere {
  const points = frustumCorners(frustum);
  const center = scale(
    1 / points.length,
    points.reduce((a, b) => add(a, b), [0, 0, 0])
  );
  const radiusSq = points.reduce(
    (accum, x) => Math.max(distSq(center, x), accum),
    0
  );
  return { center, radius: Math.sqrt(radiusSq) };
}

export type RayIntersection = { distance: number; pos: Vec3 };

export const aabbFace = {
  [Dir.X_NEG]: [0, 1, 2, 0],
  [Dir.Y_NEG]: [1, 0, 2, 0],
  [Dir.Z_NEG]: [2, 0, 1, 0],
  [Dir.X_POS]: [0, 1, 2, 1],
  [Dir.Y_POS]: [1, 0, 2, 1],
  [Dir.Z_POS]: [2, 0, 1, 1],
} as const;

export function intersectRayAabbFace(
  src: ReadonlyVec3,
  dir: ReadonlyVec3,
  aabb: ReadonlyAABB,
  d: ReadonlyVec4i
): RayIntersection | undefined {
  if (Math.abs(dir[d[0]]) < 0.000001) {
    return undefined;
  }
  const t = (aabb[d[3]][d[0]] - src[d[0]]) / dir[d[0]];
  // Reject hits behind the ray.
  if (t < 0) {
    return;
  }
  const pos = add(scale(t, dir), src);
  const hit =
    aabb[0][d[1]] <= pos[d[1]] &&
    pos[d[1]] <= aabb[1][d[1]] &&
    aabb[0][d[2]] <= pos[d[2]] &&
    pos[d[2]] <= aabb[1][d[2]];
  if (hit) {
    return { distance: t, pos };
  }
}

export function intersectRayAabb(
  src: ReadonlyVec3,
  dir: ReadonlyVec3,
  aabb: ReadonlyAABB
): RayIntersection | undefined {
  ok(Math.abs(1 - lengthSq(dir)) < 0.00001, "dir vector must be normalized.");

  // Find the intersection point between the ray and the plane of each face of
  // the AABB, checking to see if that resulting point lies on the face of the
  // AABB or not.
  let minDistHit: RayIntersection | undefined;
  values(aabbFace).forEach((x) => {
    const result = intersectRayAabbFace(src, dir, aabb, x);
    if (result) {
      if (!minDistHit || result.distance < minDistHit.distance) {
        minDistHit = result;
      }
    }
  });

  return minDistHit;
}

export function sideDir(viewDir: ReadonlyVec3f): Vec3f {
  return normalizev(cross([0, -1, 0] as Vec3f, viewDir));
}

export function viewDir([pitch, yaw]: ReadonlyVec2): Vec3 {
  return [
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ];
}

export function pitchAndYaw(viewDir: ReadonlyVec3): Vec2 {
  return [pitch(viewDir), yaw(viewDir)];
}

export function pitch(viewDir: ReadonlyVec3): number {
  const len = length(viewDir);
  if (len < EPSILON) {
    return 0;
  }
  return -Math.acos(viewDir[1] / len) + Math.PI / 2;
}

export function yaw(viewDir: ReadonlyVec3): number {
  return Math.atan2(-viewDir[0], -viewDir[2]);
}

export function reflectAndPermuteVectors(orientation: ReadonlyVec2) {
  const vd = viewDir(orientation);
  const dx = dot(vd, [1, 0, -1]);
  const dz = dot(vd, [1, 0, 1]);
  if (dx >= 0 && dz >= 0) {
    return [
      [0, 0, 0],
      [0, 1, 2],
    ] as const;
  } else if (dx >= 0 && dz < 0) {
    return [
      [0, 0, 1],
      [2, 1, 0],
    ] as const;
  } else if (dx < 0 && dz < 0) {
    return [
      [1, 0, 1],
      [0, 1, 2],
    ] as const;
  } else {
    return [
      [1, 0, 0],
      [2, 1, 0],
    ] as const;
  }
}

export function discreteRotation(
  orientation: ReadonlyVec2 | undefined,
  vec: ReadonlyVec3
): Vec3 {
  if (!orientation) {
    return [...vec];
  }
  const [_, permute] = reflectAndPermuteVectors(orientation);
  return [vec[permute[0]], vec[permute[1]], vec[permute[2]]];
}

export function discreteRotationWithReflection(
  orientation: ReadonlyVec2 | undefined,
  vec: ReadonlyVec3
): Vec3 {
  if (!orientation) {
    return [...vec];
  }
  const [reflect, permute] = reflectAndPermuteVectors(orientation);
  const ret: Vec3 = [vec[permute[0]], vec[permute[1]], vec[permute[2]]];
  return [
    ret[0] * (reflect[0] ? -1 : 1),
    ret[1] * (reflect[1] ? -1 : 1),
    ret[2] * (reflect[2] ? -1 : 1),
  ];
}

// In Javascript '%' is remainder operator. Implement a proper modulo operator.
export function modulo(n: number, m: number) {
  return ((n % m) + m) % m;
}

export function* positionIterator(size: ReadonlyVec3): Generator<Vec3> {
  for (let x = 0; x < size[0]; x++) {
    for (let y = 0; y < size[1]; y++) {
      for (let z = 0; z < size[2]; z++) {
        yield [x, y, z];
      }
    }
  }
}

export function* aabbIterator(aabb: ReadonlyAABB): Generator<Vec3> {
  for (let x = aabb[0][0]; x < aabb[1][0]; x++) {
    for (let y = aabb[0][1]; y < aabb[1][1]; y++) {
      for (let z = aabb[0][2]; z < aabb[1][2]; z++) {
        yield [x, y, z];
      }
    }
  }
}

export function integerAABB(aabb: ReadonlyAABB): AABB {
  return [floor(aabb[0]), ceil(aabb[1])];
}

export function aabbIsInteger(aabb: ReadonlyAABB) {
  return (
    isInteger(aabb[0][0]) &&
    isInteger(aabb[0][1]) &&
    isInteger(aabb[0][2]) &&
    isInteger(aabb[1][0]) &&
    isInteger(aabb[1][1]) &&
    isInteger(aabb[1][2])
  );
}

// Clamp a vector's length in the xz-direction.
export const clampVecXZ = (
  v: Vec3,
  { min, max }: { min: number; max: number }
): Vec3 => {
  let vecXZ: Vec3 = [v[0], 0, v[2]];
  if (length(vecXZ) > max) {
    vecXZ = scale(max, normalizev(vecXZ));
    return [vecXZ[0], v[1], vecXZ[2]];
  }
  if (length(vecXZ) < min) {
    vecXZ = scale(min, normalizev(vecXZ));
    return [vecXZ[0], v[1], vecXZ[2]];
  }

  return v;
};

export function nearestGridPosition(
  pos: ReadonlyVec3,
  size: ReadonlyVec3,
  grid: number
): Vec3 {
  const offset = scale(0.5, size);
  const v0 = sub(pos, offset);
  const v0Aligned = scale(grid, round(scale(1 / grid, v0)));
  return add(v0Aligned, offset);
}
