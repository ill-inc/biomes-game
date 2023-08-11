import type { Vec3f } from "@/shared/wasm/types/common";
import { z } from "zod";

export const zVec2f = z.tuple([z.number(), z.number()]);
export const zVec3f = z.tuple([z.number(), z.number(), z.number()]);

export type Vec2 = [x: number, y: number];
export type Vec3 = [x: number, y: number, z: number];
export type Vec4 = [x: number, y: number, z: number, w: number];

export type ReadonlyVec2 = Readonly<Vec2>;
export type ReadonlyVec3 = Readonly<Vec3>;
export type ReadonlyVec4 = Readonly<Vec4>;

// Column-major.
export type Mat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

export type ReadonlyMat4 = Readonly<Mat4>;

// Assumed to be inclusive-exclusive, in other words AABB contains AABB[0], but
// does not contain AABB[1].
export type AABB = [min: Vec3, max: Vec3];
export type AABB2 = [min: Vec2, max: Vec2];

export type ReadonlyAABB = readonly [min: ReadonlyVec3, max: ReadonlyVec3];
export type ReadonlyAABB2 = readonly [min: ReadonlyVec2, max: ReadonlyVec2];

export const zAABB = z.tuple([zVec3f, zVec3f]);

export const zBox = z.object({
  v0: zVec3f,
  v1: zVec3f,
});

export type Sphere = {
  center: Vec3;
  radius: number;
};

export type ReadonlySphere = {
  readonly center: ReadonlyVec3;
  readonly radius: number;
};

export type Plane = Vec4;
export type ReadonlyPlane = ReadonlyVec4;

// A convex polytope being the intersection of a set of half spaces.
export type ConvexPolytope = Plane[];
export type ReadonlyConvexPolytope = readonly ReadonlyPlane[];

export type OrientedPoint = [position: Vec3, orientation: Vec2];
export type ReadonlyOrientedPoint = readonly [
  position: Vec3,
  orientation: Vec2
];

export type OptionallyOrientedPoint = [position: Vec3f, orientation?: Vec2];
export type ReadonlyOptionallyOrientedPoint = readonly [
  position: Vec3f,
  orientation?: Vec2
];
