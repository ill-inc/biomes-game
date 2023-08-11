import { DeletableScope } from "@/shared/deletable";
import { shardsForAABB, worldPos } from "@/shared/game/shard";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { DataType, Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { WorldMap } from "@/shared/wasm/types/gaia";

export function* worldMapShards<T extends DataType>(map: WorldMap<T>) {
  const shards = shardsForAABB(map.aabb.v0, map.aabb.v1);
  const scope = new DeletableScope();
  try {
    for (const shardId of shards) {
      const chunk = scope.use(map.chunk(worldPos(shardId)));
      yield [shardId, chunk] as const;
    }
  } finally {
    scope.delete();
  }
}

export function makeWorldMap(
  voxeloo: VoxelooModule,
  tensor: Tensor<"U8">,
  offset: ReadonlyVec3
): WorldMap<"U8"> {
  const aabb = {
    v0: offset,
    v1: add(tensor.shape, offset),
  } as const;
  return new voxeloo.WorldMap_U8(aabb, tensor.cpp);
}
