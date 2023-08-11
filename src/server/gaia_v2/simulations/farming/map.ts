import { sizeAABB } from "@/shared/math/linear";
import type { AABB } from "@/shared/math/types";
import { Sparse3, SparseBimap3, SparseSet3 } from "@/shared/util/sparse";

const DEFAULT_GAIA_SHARD_AABB: AABB = [
  [-2048, -224, -2048],
  [2048, 288, 2048],
];

export function makeWorldMap<T>(aabb: AABB = DEFAULT_GAIA_SHARD_AABB) {
  return new Sparse3<T>(sizeAABB(aabb), aabb[0]);
}

export function makeWorldSet(aabb: AABB = DEFAULT_GAIA_SHARD_AABB) {
  return new SparseSet3(sizeAABB(aabb), aabb[0]);
}

export function makeWorldBimap<T>(aabb: AABB = DEFAULT_GAIA_SHARD_AABB) {
  return new SparseBimap3<T>(sizeAABB(aabb), aabb[0]);
}
