import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { makeDisposable } from "@/shared/disposable";
import { toIsomorphismId } from "@/shared/game/ids";
import type { IsomorphismResourcePaths } from "@/shared/game/resources/isomorphisms";
import { addTensorWithBoundaryHash } from "@/shared/game/resources/tensor_boundary_hashes";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import type * as Shards from "@/shared/game/shard";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { Optional } from "@/shared/util/type_helpers";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { BlockIndex } from "@/shared/wasm/types/galois";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";

interface BlockOnlyResourcePaths {
  "/terrain/block/isomorphisms": PathDef<
    [Shards.ShardId],
    Optional<Tensor<"U32">>
  >;
  "/terrain/block/isomorphisms/boundary_hashes": PathDef<
    [Shards.ShardId],
    Promise<Optional<TensorBoundaryHashes>>
  >;
  "/terrain/block/tensor": PathDef<[Shards.ShardId], Optional<Tensor<"U32">>>;
  "/terrain/block/index": PathDef<[], BlockIndex>;
}

export type BlockResourcePaths = BlockOnlyResourcePaths &
  IsomorphismResourcePaths &
  TerrainResourcePaths;
export type BlockResourceDeps = TypedResourceDeps<BlockResourcePaths>;

async function loadBlockIndex(voxeloo: VoxelooModule) {
  const config = await jsonFetch<{ index: string }>(
    resolveAssetUrl("indices/blocks")
  );

  const ret = new voxeloo.BlockIndex();
  ret.load(config.index);
  return ret;
}

function genBlockTensor(
  voxeloo: VoxelooModule,
  deps: BlockResourceDeps,
  shardId: Shards.ShardId
) {
  const tensor = deps.get("/terrain/tensor", shardId);
  if (!tensor) {
    return;
  }

  const ret = new Tensor(voxeloo, voxeloo.toBlockTensor(tensor.cpp));
  return makeDisposable(ret, () => {
    ret.delete();
  });
}

function genBlockIsomorphisms(
  voxeloo: VoxelooModule,
  deps: BlockResourceDeps,
  shardId: Shards.ShardId
) {
  const blocks = deps.get("/terrain/block/tensor", shardId);
  if (!blocks || blocks.zero()) {
    return;
  }

  const isomorphisms = deps.get("/terrain/isomorphisms", shardId);

  // Generate the tensor of shape isomorphisms.
  const blockIsomorphisms = timeCode("blocks:toMergedIsomorphismTensor", () => {
    return new Tensor(
      voxeloo,
      voxeloo.toMergedIsomorphismTensor(
        blocks.cpp,
        isomorphisms.cpp,
        toIsomorphismId(1, 0)
      )
    );
  });

  return makeDisposable(blockIsomorphisms, () => {
    blockIsomorphisms.delete();
  });
}

export type BlockResources = TypedResources<BlockResourcePaths>;
type BlockResourcesBuilder = BiomesResourcesBuilder<BlockResourcePaths>;

export async function addSharedBlockResources(
  voxeloo: VoxelooModule,
  builder: BlockResourcesBuilder
) {
  addTensorWithBoundaryHash(
    builder,
    "/terrain/block/isomorphisms",
    (deps, shard) => genBlockIsomorphisms(voxeloo, deps, shard)
  );
  builder.add("/terrain/block/tensor", (deps, shard) =>
    genBlockTensor(voxeloo, deps, shard)
  );

  // We load the block and shape index up front.
  builder.addGlobal("/terrain/block/index", await loadBlockIndex(voxeloo));
}
