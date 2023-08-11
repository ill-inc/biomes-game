import type { Change, Create, Update } from "@/shared/ecs/change";
import type { ShardId } from "@/shared/ecs/gen/types";
import {
  SHARD_DIM,
  SHARD_SHAPE,
  shardEncode,
  shardNeighborsWithDiagonals,
  voxelShard,
  voxelToShardPos,
} from "@/shared/game/shard";

import type { BiomesId } from "@/shared/ids";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { DefaultMap } from "@/shared/util/collections";
import { Sparse3 } from "@/shared/util/sparse";
import { ok } from "assert";

export class DelayQueue<K> {
  private readonly queue = new Map<K, number>();
  #lwm: number | undefined;

  get lwm() {
    if (this.#lwm === undefined && this.queue.size > 0) {
      this.#lwm = Math.min(...this.queue.values());
    }
    return this.#lwm;
  }

  get size() {
    return this.queue.size;
  }

  has(key: K): boolean {
    return this.queue.has(key);
  }

  delete(key: K): void {
    this.queue.delete(key);
    this.#lwm = undefined;
  }

  schedule(key: K, time: number): void {
    if (!this.queue.has(key) || this.queue.get(key)! > time) {
      this.queue.set(key, time);
      this.#lwm = undefined;
    }
  }

  peekAll(): K[] {
    return [...this.queue.keys()];
  }

  pop(time: number): K[] {
    const result: K[] = [];
    for (const [key, val] of this.queue) {
      if (val < time) {
        result.push(key);
        this.queue.delete(key);
      }
    }
    if (result.length > 0) {
      this.#lwm = undefined;
    }
    return result;
  }
}

export function receptiveField(src: ReadonlyVec3, radii: ReadonlyVec3) {
  ok(radii.every((r) => r <= SHARD_DIM / 2));
  const [x0, x1] = [-radii[0], radii[0]];
  const [y0, y1] = [-radii[1], radii[1]];
  const [z0, z1] = [-radii[2], radii[2]];
  const ret = new Set<ShardId>();
  ret.add(voxelShard(...add(src, [x0, y0, z0])));
  ret.add(voxelShard(...add(src, [x1, y0, z0])));
  ret.add(voxelShard(...add(src, [x0, y1, z0])));
  ret.add(voxelShard(...add(src, [x1, y1, z0])));
  ret.add(voxelShard(...add(src, [x0, y0, z1])));
  ret.add(voxelShard(...add(src, [x1, y0, z1])));
  ret.add(voxelShard(...add(src, [x0, y1, z1])));
  ret.add(voxelShard(...add(src, [x1, y1, z1])));
  return Array.from(ret);
}

export function shardAndNeighborsOfDirs(
  pos: ReadonlyVec3,
  ...dirs: ReadonlyVec3[]
) {
  const shardPos = voxelToShardPos(...pos);
  const ret: ShardId[] = [];
  ret.push(shardEncode(...shardPos));
  for (const dir of dirs) {
    ret.push(shardEncode(...add(shardPos, dir)));
  }
  return ret;
}

export function shardAndNeighbors(pos: ReadonlyVec3) {
  return [
    voxelShard(...pos),
    ...shardNeighborsWithDiagonals(voxelShard(...pos)),
  ];
}

export function makeChunkIndex<T>() {
  return new DefaultMap<BiomesId, Sparse3<T>>(() => new Sparse3(SHARD_SHAPE));
}

export function terrainWasModified(change: Change): change is Update | Create {
  return (
    change.kind !== "delete" &&
    !!(change.entity.shard_seed || change.entity.shard_diff)
  );
}
