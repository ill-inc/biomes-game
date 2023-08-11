import { ceil, div, floor, mul } from "@/shared/math/linear";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { ok } from "assert";
import type { ZodType } from "zod";
import { z } from "zod";

export const SHARD_LEVEL = 5;
export const SHARD_DIM = 32;
export const SHARD_SHAPE: Vec3 = [32, 32, 32];
export const SHARD_RADIUS = Math.sqrt(3) * (SHARD_DIM / 2);

// Returns block-local coordinates of the given voxel in world coordinates.
export function blockPos(x: number, y: number, z: number): Vec3 {
  return [
    (SHARD_DIM + (x % SHARD_DIM)) % SHARD_DIM,
    (SHARD_DIM + (y % SHARD_DIM)) % SHARD_DIM,
    (SHARD_DIM + (z % SHARD_DIM)) % SHARD_DIM,
  ];
}

export type ShardId = string & { readonly "": unique symbol };

export const zShardId = z.string() as unknown as ZodType<ShardId>;

const MAX_ABS_SHARD_COORD = 100_000;

// Must match voxeloo/biomes/shards.hpp shard_encode.
export function shardEncode(x: number, y: number, z: number): ShardId {
  // 8-bit
  let id = String.fromCharCode(
    (SHARD_LEVEL & 0x1f) |
      (x < 0 ? 0x80 : 0) |
      (y < 0 ? 0x40 : 0) |
      (z < 0 ? 0x20 : 0)
  );
  x = Math.abs(x);
  y = Math.abs(y);
  z = Math.abs(z);
  ok(
    x < MAX_ABS_SHARD_COORD &&
      y < MAX_ABS_SHARD_COORD &&
      z < MAX_ABS_SHARD_COORD,
    "position out of range"
  );
  while (x !== 0 || y !== 0 || z !== 0) {
    id += String.fromCharCode(x & 0xff, y & 0xff, z & 0xff);
    x >>= 8;
    y >>= 8;
    z >>= 8;
  }
  return id as unknown as ShardId;
}

// Must match voxeloo/biomes/shards.hpp shard_decode.
export function shardDecode(id: ShardId): Vec3 {
  const n = id.length;
  ok(n > 0 && n % 3 === 1 && n <= 10);

  const head = id.charCodeAt(0);
  ok((head & 0x1f) === SHARD_LEVEL);

  const ret: Vec3 = [0, 0, 0];
  for (let i = n - 1; i >= 1; ) {
    ret[2] = (ret[2] << 8) | id.charCodeAt(i--);
    ret[1] = (ret[1] << 8) | id.charCodeAt(i--);
    ret[0] = (ret[0] << 8) | id.charCodeAt(i--);
  }
  ret[0] = head & 0x80 ? -ret[0] : ret[0];
  ret[1] = head & 0x40 ? -ret[1] : ret[1];
  ret[2] = head & 0x20 ? -ret[2] : ret[2];
  return ret;
}

// Return the shard coordinates of the shard containing the given voxel.
export function voxelToShardPos(x: number, y: number, z: number): Vec3 {
  const sx = Math.floor(x / SHARD_DIM);
  const sy = Math.floor(y / SHARD_DIM);
  const sz = Math.floor(z / SHARD_DIM);
  return [sx, sy, sz];
}

// Returns the world coordinates of the given shard coordinate
export function shardToVoxelPos(x: number, y: number, z: number): Vec3 {
  const sx = x * SHARD_DIM;
  const sy = y * SHARD_DIM;
  const sz = z * SHARD_DIM;
  return [sx, sy, sz];
}

// Returns the smallest world coordinate of the shard with given voxel.
export function shardAlign(x: number, y: number, z: number): Vec3 {
  return shardToVoxelPos(...voxelToShardPos(x, y, z));
}

// Returns the key of the shard containing the given voxel.
export function voxelShard(x: number, y: number, z: number): ShardId {
  return shardEncode(...voxelToShardPos(x, y, z));
}

// Returns the center position of the given shard in world coordinates.
export function shardCenter(shard: ShardId): Vec3 {
  const [x, y, z] = shardDecode(shard);
  return shardToVoxelPos(x + 0.5, y + 0.5, z + 0.5);
}

// Return the box containing a given shard.
export function shardAABB(shard: ShardId): [Vec3, Vec3] {
  const [x, y, z] = shardDecode(shard);
  return [shardToVoxelPos(x, y, z), shardToVoxelPos(x + 1, y + 1, z + 1)];
}

// Returns the position of the given shard in world coordinates.
export function worldPos(shard: ShardId): Vec3 {
  return mul(SHARD_DIM, shardDecode(shard));
}

export function friendlyShardId(code: ShardId) {
  const [x, y, z] = shardDecode(code);
  return `[${x},${y},${z}](${Buffer.from(code).toString("hex")})`;
}

// Returns all shard keys that intersect the given AABB.
export function shardsForAABB(v0: ReadonlyVec3, v1: ReadonlyVec3) {
  const ret = new Set<ShardId>();

  const start = floor(div(SHARD_DIM, v0));
  const end = ceil(div(SHARD_DIM, v1));

  for (let x = start[0]; x < end[0]; x++) {
    for (let y = start[1]; y < end[1]; y++) {
      for (let z = start[2]; z < end[2]; z++) {
        ret.add(shardEncode(x, y, z));
      }
    }
  }
  return [...ret];
}

export function shardNeighborsWithDiagonals(code: ShardId): ShardId[] {
  const [x, y, z] = shardDecode(code);

  const ret: ShardId[] = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0 && dz === 0) {
          continue;
        }
        ret.push(shardEncode(x + dx, y + dy, z + dz));
      }
    }
  }
  return ret;
}

export function voxelPosToIndex([x, y, z]: ReadonlyVec3): number {
  return x | (y << 5) | (z << 10);
}

export function voxelIndexToPos(i: number): Vec3 {
  return [i % 32, (i >> 5) % 32, (i >> 10) % 32];
}

export function shardNeighbours(code: ShardId): ShardId[] {
  const [x, y, z] = shardDecode(code);

  return [
    shardEncode(x - 1, y, z),
    shardEncode(x + 1, y, z),
    shardEncode(x, y - 1, z),
    shardEncode(x, y + 1, z),
    shardEncode(x, y, z - 1),
    shardEncode(x, y, z + 1),
  ];
}
