import { makeDisposable } from "@/shared/disposable";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import * as Shards from "@/shared/game/shard";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { BoxDict } from "@/shared/wasm/types/galois";

export interface WaterOnlyResourcePaths {
  "/water/tensor": PathDef<[Shards.ShardId], Tensor<"U8">>;
  "/water/boxes": PathDef<[Shards.ShardId], BoxDict>;
}
export type WaterResourcePaths = WaterOnlyResourcePaths &
  IndexedEcsResourcePaths;

export type WaterResourceDeps = TypedResourceDeps<WaterResourcePaths>;

function genWaterTensor(
  voxeloo: VoxelooModule,
  deps: WaterResourceDeps,
  shardId: Shards.ShardId
) {
  const ret = Tensor.make(voxeloo, Shards.SHARD_SHAPE, "U8");

  // Load the tensor data from the terrain shard.
  const shard = deps.get("/ecs/terrain", shardId);
  ret.load(shard?.shard_water?.buffer);
  return makeDisposable(ret, () => {
    ret.delete();
  });
}

function genWaterBoxes(
  voxeloo: VoxelooModule,
  deps: WaterResourceDeps,
  shardId: Shards.ShardId
) {
  const tensor = deps.get("/water/tensor", shardId);
  const boxes = voxeloo.toWaterBoxDict(tensor.cpp, Shards.worldPos(shardId));
  return makeDisposable(boxes, () => {
    boxes.delete();
  });
}

export type WaterResources = TypedResources<WaterResourcePaths>;
type WaterResourcesBuilder = BiomesResourcesBuilder<WaterResourcePaths>;

export function addSharedWaterResources(
  voxeloo: VoxelooModule,
  builder: WaterResourcesBuilder
) {
  builder.add("/water/tensor", (deps, shard) =>
    genWaterTensor(voxeloo, deps, shard)
  );
  builder.add("/water/boxes", (deps, shard) =>
    genWaterBoxes(voxeloo, deps, shard)
  );
}
