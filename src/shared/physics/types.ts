import type { AABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import type { DeepReadonly } from "@/shared/util/type_helpers";

export type Body = { aabb: AABB; velocity: ReadonlyVec3 };

export type Force = (dt: number, body: Readonly<Body>) => Vec3;

export type Movement = { impulse: Vec3; velocity: Vec3 };

export type Constraint = (
  body: DeepReadonly<Body>,
  move: DeepReadonly<Movement>
) => Movement;

export type HitFn = (hit: AABB) => boolean | void;

export type CollisionIndex = (aabb: AABB, fn: HitFn) => void;

export type ClimbableIndex = (aabb: AABB, dir: Vec3) => boolean;

export type GroundedIndex = (aabb: AABB) => boolean;
