import type { ShardId } from "@/shared/game/shard";
import { shardEncode, shardsForAABB, voxelShard } from "@/shared/game/shard";
import type { Vec3 } from "@/shared/math/types";
import assert from "assert";

describe("Shards", () => {
  it("Can compute a large shard ID", () => {
    const id = shardEncode(99_999, 99_999, 99_999);
    assert.equal(id.length, 10);
  });

  it("Rejects out of bounds IDs", () => {
    assert.throws(() => shardEncode(200_000, 200_000, 200_000));
  });

  it("Should return the correct shard ids for an AABB", () => {
    const start: Vec3 = [-100, -100, -100];
    const end: Vec3 = [100, 100, 100];

    const actualShards = new Set<ShardId>(shardsForAABB(start, end));
    const expectedShards = new Set<ShardId>();

    for (let x = start[0]; x < end[0]; x += 1) {
      for (let y = start[1]; y < end[1]; y += 1) {
        for (let z = start[2]; z < end[2]; z += 1) {
          expectedShards.add(voxelShard(x, y, z));
        }
      }
    }

    assert.deepEqual([...actualShards].sort(), [...expectedShards].sort());
  });

  it("Should return the correct shard ids for a single shard", () => {
    const start: Vec3 = [0, 0, 0];
    const end: Vec3 = [31, 31, 31];

    const actualShards = new Set<ShardId>(shardsForAABB(start, end));
    const expectedShards = new Set<ShardId>();

    for (let x = start[0]; x < end[0]; x += 1) {
      for (let y = start[1]; y < end[1]; y += 1) {
        for (let z = start[2]; z < end[2]; z += 1) {
          expectedShards.add(voxelShard(x, y, z));
        }
      }
    }

    assert.deepEqual([...actualShards].sort(), [...expectedShards].sort());
  });

  it("Should return the correct shard ids for an exact match", () => {
    const start: Vec3 = [0, 0, 0];
    const end: Vec3 = [32, 32, 32];

    const actualShards = new Set<ShardId>(shardsForAABB(start, end));
    const expectedShards = new Set<ShardId>();

    for (let x = start[0]; x < end[0]; x += 1) {
      for (let y = start[1]; y < end[1]; y += 1) {
        for (let z = start[2]; z < end[2]; z += 1) {
          expectedShards.add(voxelShard(x, y, z));
        }
      }
    }

    assert.deepEqual([...actualShards].sort(), [...expectedShards].sort());
  });
});

export default {};
