import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import type {
  ReadonlyAABB,
  ReadonlySphere,
  ReadonlyVec3,
} from "@/shared/math/types";

export type EntryDomain = ReadonlyAABB | ReadonlyVec3f;

export function isEntryDomainAabb(
  maybeAabb: EntryDomain
): maybeAabb is ReadonlyAABB {
  return maybeAabb.length === 2;
}

export type SpatialQueryOptions = {
  approx?: boolean;
  // Will be run on each bucket and entity containing entities that has already
  // passed the main shape query. The advantage of supplying this function
  // instead of specifying `approx` and checking entities later is that the
  // refine function will also be applied on the buckets themselves, before
  // entities are checked.
  refine?: (domain: EntryDomain) => boolean;
};

export type SpatialQueryParams =
  | {
      kind: "sphere";
      shape: ReadonlySphere;
    }
  | {
      kind: "aabb";
      shape: ReadonlyAABB;
    }
  | {
      kind: "point";
      shape: ReadonlyVec3;
    }
  | {
      kind: "all";
    };
