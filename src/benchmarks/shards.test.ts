import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { ShardId } from "@/shared/game/shard";
import { shardEncode } from "@/shared/game/shard";
import type { VoxelooModule } from "@/shared/wasm/types";

const RADIUS = 50;

describe("Shard encode benchmarks", () => {
  let voxeloo!: VoxelooModule;
  beforeEach(async () => {
    voxeloo = await loadVoxeloo();
  });

  it("Concat", () => {
    const shards: ShardId[] = [];
    for (let z = -RADIUS; z <= RADIUS; ++z) {
      for (let y = -RADIUS; y <= RADIUS; ++y) {
        for (let x = -RADIUS; x <= RADIUS; ++x) {
          shards.push(`${x}:${y}:${z}` as unknown as ShardId);
        }
      }
    }
    return shards;
  });

  it("CacheKey", () => {
    const shards: ShardId[] = [];
    for (let z = -RADIUS; z <= RADIUS; ++z) {
      for (let y = -RADIUS; y <= RADIUS; ++y) {
        for (let x = -RADIUS; x <= RADIUS; ++x) {
          shards.push(
            [x, y, z]
              .map((x: number | string) => x.toString())
              .join(":") as unknown as ShardId
          );
        }
      }
    }
  });

  it("TS", () => {
    const shards: ShardId[] = [];
    for (let z = -RADIUS; z <= RADIUS; ++z) {
      for (let y = -RADIUS; y <= RADIUS; ++y) {
        for (let x = -RADIUS; x <= RADIUS; ++x) {
          shards.push(shardEncode(x, y, z));
        }
      }
    }
    return shards;
  });

  it("C++", () => {
    const shards: ShardId[] = [];
    for (let z = -RADIUS; z <= RADIUS; ++z) {
      for (let y = -RADIUS; y <= RADIUS; ++y) {
        for (let x = -RADIUS; x <= RADIUS; ++x) {
          shards.push(voxeloo.shardEncode([x, y, z]));
        }
      }
    }
    return shards;
  });
});
