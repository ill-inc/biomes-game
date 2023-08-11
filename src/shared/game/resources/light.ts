import { makeDisposable } from "@/shared/disposable";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import { addTensorWithBoundaryHash } from "@/shared/game/resources/tensor_boundary_hashes";
import * as Shards from "@/shared/game/shard";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";

export interface LightingOnlyResourcePaths {
  "/lighting/irradiance": PathDef<[Shards.ShardId], Tensor<"U32">>;
  "/lighting/irradiance/boundary_hashes": PathDef<
    [Shards.ShardId],
    TensorBoundaryHashes
  >;
  "/lighting/sky_occlusion": PathDef<[Shards.ShardId], Tensor<"U8">>;
  "/lighting/sky_occlusion/boundary_hashes": PathDef<
    [Shards.ShardId],
    TensorBoundaryHashes
  >;
}
export type LightingResourcePaths = LightingOnlyResourcePaths &
  IndexedEcsResourcePaths;

export type LightingResourceDeps = TypedResourceDeps<LightingResourcePaths>;

function genSkyOcclusionTensor(
  voxeloo: VoxelooModule,
  deps: LightingResourceDeps,
  shardId: Shards.ShardId
) {
  const ret = Tensor.make(voxeloo, Shards.SHARD_SHAPE, "U8");

  // Load the tensor data from the terrain shard.
  const shard = deps.get("/ecs/terrain", shardId);
  ret.load(shard?.shard_sky_occlusion?.buffer);

  return makeDisposable(ret, () => {
    ret.delete();
  });
}

function genIrradianceTensor(
  voxeloo: VoxelooModule,
  deps: LightingResourceDeps,
  shardId: Shards.ShardId
) {
  const ret = Tensor.make(voxeloo, Shards.SHARD_SHAPE, "U32");

  // Load the tensor data from the terrain shard.
  const shard = deps.get("/ecs/terrain", shardId);
  ret.load(shard?.shard_irradiance?.buffer);
  return makeDisposable(ret, () => {
    ret.delete();
  });
}

export type LightingResources = TypedResources<LightingResourcePaths>;
type LightingResourcesBuilder = BiomesResourcesBuilder<LightingResourcePaths>;

export function addSharedLightingResources(
  voxeloo: VoxelooModule,
  builder: LightingResourcesBuilder
) {
  addTensorWithBoundaryHash(
    builder,
    "/lighting/sky_occlusion",
    (deps, shardId) => genSkyOcclusionTensor(voxeloo, deps, shardId)
  );
  addTensorWithBoundaryHash(builder, "/lighting/irradiance", (deps, shardId) =>
    genIrradianceTensor(voxeloo, deps, shardId)
  );
}
