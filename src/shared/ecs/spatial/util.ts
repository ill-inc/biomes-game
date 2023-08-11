import type { ReadonlyVec3i } from "@/shared/ecs/gen/types";
import {
  isEntryDomainAabb,
  type EntryDomain,
} from "@/shared/ecs/spatial/types";
import {
  add,
  containsAABB,
  distSq,
  distSqToAABB,
  intersectsAABB,
  mul,
} from "@/shared/math/linear";
import type {
  AABB,
  ReadonlyAABB,
  ReadonlySphere,
  ReadonlyVec3,
} from "@/shared/math/types";
import { isEqual } from "lodash";

export function entryDomainIntersectsSphereSq(
  domain: EntryDomain,
  sphereSq: ReadonlySphere
) {
  if (isEntryDomainAabb(domain)) {
    if (distSqToAABB(sphereSq.center, domain) <= sphereSq.radius) {
      return true;
    } else {
      return false;
    }
  } else {
    return distSq(domain, sphereSq.center) <= sphereSq.radius;
  }
}

export function entryDomainIntersectsAabb(
  domain: EntryDomain,
  aabb: ReadonlyAABB
) {
  if (isEntryDomainAabb(domain)) {
    return intersectsAABB(aabb, domain);
  } else {
    return containsAABB(aabb, domain);
  }
}

export function entryDomainContainsPoint(
  domain: EntryDomain,
  point: ReadonlyVec3
) {
  if (isEntryDomainAabb(domain)) {
    return containsAABB(domain, point);
  } else {
    return isEqual(point, domain);
  }
}

export function* bucketsWithinSphere(
  sphere: ReadonlySphere,
  dim: number
): Generator<ReadonlyVec3i> {
  const dimInv = 1 / dim;
  const {
    center: [x, y, z],
    radius,
  } = sphere;
  const ix = Math.floor(x * dimInv);
  const iy = Math.floor(y * dimInv);
  const iz = Math.floor(z * dimInv);
  const rd = radius * dimInv;
  const ir = Math.ceil(rd);
  const rd2 = (rd + Math.sqrt(3)) ** 2;
  for (let dz = -ir; dz <= ir; dz += 1) {
    for (let dy = -ir; dy <= ir; dy += 1) {
      for (let dx = -ir; dx <= ir; dx += 1) {
        if (dx ** 2 + dy ** 2 + dz ** 2 > rd2) {
          continue;
        }
        yield [ix + dx, iy + dy, iz + dz];
      }
    }
  }
}

export function* bucketsWithinAabb(
  aabb: ReadonlyAABB,
  dim: number
): Generator<ReadonlyVec3i> {
  const dimInv = 1 / dim;
  const x0 = Math.floor(aabb[0][0] * dimInv);
  const y0 = Math.floor(aabb[0][1] * dimInv);
  const z0 = Math.floor(aabb[0][2] * dimInv);

  const x1 = Math.ceil(aabb[1][0] * dimInv);
  const y1 = Math.ceil(aabb[1][1] * dimInv);
  const z1 = Math.ceil(aabb[1][2] * dimInv);

  for (let dz = z0; dz < z1; dz += 1) {
    for (let dy = y0; dy < y1; dy += 1) {
      for (let dx = x0; dx < x1; dx += 1) {
        yield [dx, dy, dz];
      }
    }
  }
}

export function aabbForBucketPos(bucketPos: ReadonlyVec3i, dim: number): AABB {
  const minCorner = mul(dim, bucketPos);
  const maxCorner = add(minCorner, [dim, dim, dim]);
  return [minCorner, maxCorner];
}
