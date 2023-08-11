import type {
  ReadonlyVec3f,
  ReadonlyVec3i,
  ShardId,
} from "@/shared/ecs/gen/types";
import type { SpatialQueryOptions } from "@/shared/ecs/spatial/types";
import {
  isEntryDomainAabb,
  type EntryDomain,
} from "@/shared/ecs/spatial/types";
import {
  aabbForBucketPos,
  bucketsWithinAabb,
  bucketsWithinSphere,
  entryDomainContainsPoint,
  entryDomainIntersectsAabb,
  entryDomainIntersectsSphereSq,
} from "@/shared/ecs/spatial/util";
import { SHARD_DIM, shardEncode, voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import type {
  ReadonlyAABB,
  ReadonlySphere,
  ReadonlyVec3,
} from "@/shared/math/types";
import { MultiMap } from "@/shared/util/collections";
import { ok } from "assert";

// Implements common functionality of spatial indexing, but no update method.
export class BaseSpatialIndex {
  // implements KeyIndex<ShardId> {
  private buckets = new MultiMap<ShardId, BiomesId>();
  private inverse = new Map<BiomesId, [EntryDomain, ShardId[]]>();

  constructor(private readonly explicitTotalScanThreshold?: number) {}

  scanByKey(bucket: ShardId) {
    return this.buckets.get(bucket);
  }

  getAllKeys() {
    return Array.from(this.buckets.keys());
  }

  getKeys(id: BiomesId) {
    const key = this.inverse.get(id)?.[1];
    return key === undefined ? [] : key;
  }

  get size() {
    return this.inverse.size;
  }

  *scanAll() {
    yield* this.inverse.keys();
  }

  private totalScanThreshold(radius: number) {
    return (
      this.explicitTotalScanThreshold ??
      // Larger radius imply more buckets scanned, so make large radii scans
      // less likely to search buckets.
      Math.max(((2 * radius) / SHARD_DIM) ** 3, 40)
    );
  }

  // For all buckets within the radius, returns all entities in those buckets.
  // Thus, some entities that are outside of the radius will be returned because
  // the entity's bucket is inside the radius.
  // More expensive than approxScanNearby, but will check that all returned
  // entities lie in the specified radius.
  *scanSphere(
    { center, radius }: ReadonlySphere,
    options?: SpatialQueryOptions
  ) {
    if (!isFinite(radius)) {
      yield* this.scanAll();
    } else if (this.inverse.size < this.totalScanThreshold(radius)) {
      const sphereSq = { center, radius: radius ** 2 };
      for (const [id, [domain]] of this.inverse) {
        if (!entryDomainIntersectsSphereSq(domain, sphereSq)) {
          continue;
        }
        if (!this.domainPassesRefinement(domain, options)) {
          continue;
        }
        yield id;
      }
    } else {
      const seen = new Set<BiomesId>();
      const sphereSq = { center, radius: radius ** 2 };
      for (const bucketPos of bucketsWithinSphere(
        { center, radius },
        SHARD_DIM
      )) {
        const bucket = shardEncode(...bucketPos);
        if (!this.bucketPassesRefinement(bucket, bucketPos, options)) {
          continue;
        }

        for (const id of this.scanByKey(bucket)) {
          if (seen.has(id)) {
            continue;
          }
          if (!options?.approx) {
            const domain = this.get(id)!;
            ok(domain);
            if (!entryDomainIntersectsSphereSq(domain, sphereSq)) {
              continue;
            }
            if (!this.domainPassesRefinement(domain, options)) {
              continue;
            }
          }
          seen.add(id);
          yield id;
        }
      }
    }
  }

  *scanAabb(aabb: ReadonlyAABB, options?: SpatialQueryOptions) {
    const seen = new Set<BiomesId>();
    for (const bucketPos of bucketsWithinAabb(aabb, SHARD_DIM)) {
      const bucket = shardEncode(...bucketPos);
      if (!this.bucketPassesRefinement(bucket, bucketPos, options)) {
        continue;
      }

      for (const id of this.scanByKey(bucket)) {
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);
        const domain = this.get(id)!;
        if (!options?.approx) {
          if (!entryDomainIntersectsAabb(domain, aabb)) {
            continue;
          }
          if (!this.domainPassesRefinement(domain, options)) {
            continue;
          }
        }
        yield id;
      }
    }
  }

  *scanPoint(point: ReadonlyVec3, options?: SpatialQueryOptions) {
    const bucket = voxelShard(...point);
    if (options?.approx) {
      yield* this.scanByKey(bucket);
    } else {
      for (const id of this.scanByKey(bucket)) {
        const domain = this.get(id)!;
        if (!entryDomainContainsPoint(domain, point)) {
          continue;
        }
        if (!this.domainPassesRefinement(domain, options)) {
          continue;
        }

        yield id;
      }
    }
  }

  protected delete(id: BiomesId) {
    const buckets = this.inverse.get(id)?.[1];
    if (buckets) {
      for (const bucket of buckets) {
        this.buckets.delete(bucket, id);
      }
      this.inverse.delete(id);
    }
  }

  clear() {
    this.buckets.clear();
    this.inverse.clear();
  }

  get(id: BiomesId): EntryDomain | undefined {
    return this.inverse.get(id)?.[0];
  }

  protected updatePosition(id: BiomesId, position: ReadonlyVec3f) {
    let old = this.inverse.get(id);
    if (old && isEntryDomainAabb(old[0])) {
      // Switching from AABB to point should be uncommon, so don't do anything
      // fancy just delete it and move on.
      this.delete(id);
      old = undefined;
    }

    const bucket = voxelShard(...position);
    const oldBucket = old?.[1][0];
    if (oldBucket === bucket) {
      ok(old);
      old[0] = position;
      return;
    } else if (oldBucket) {
      this.buckets.delete(oldBucket, id);
    }
    this.buckets.add(bucket, id);
    this.inverse.set(id, [position, [bucket]]);
  }

  protected updateVolume(id: BiomesId, aabb: ReadonlyAABB) {
    let old = this.inverse.get(id);
    if (old && !isEntryDomainAabb(old[0])) {
      // Switching from point to AABB should be uncommon, so don't do anything
      // fancy just delete it and move on.
      this.delete(id);
      old = undefined;
    }

    const buckets = Array.from(bucketsWithinAabb(aabb, SHARD_DIM), (b) =>
      shardEncode(...b)
    );
    const oldBuckets = old?.[1] ?? [];
    for (const oldBucket of oldBuckets) {
      if (!buckets.includes(oldBucket)) {
        this.buckets.delete(oldBucket, id);
      }
    }
    for (const bucket of buckets) {
      if (!oldBuckets.includes(bucket)) {
        this.buckets.add(bucket, id);
      }
    }
    this.inverse.set(id, [aabb, buckets]);
  }

  private bucketPassesRefinement(
    bucket: ShardId,
    bucketPos: ReadonlyVec3i,
    options?: SpatialQueryOptions
  ) {
    return (
      !options?.refine ||
      (this.buckets.get(bucket).length > 0 &&
        options.refine(aabbForBucketPos(bucketPos, SHARD_DIM)))
    );
  }

  private domainPassesRefinement(
    domain: EntryDomain,
    options?: SpatialQueryOptions
  ) {
    return !options?.refine || options.refine(domain);
  }
}
