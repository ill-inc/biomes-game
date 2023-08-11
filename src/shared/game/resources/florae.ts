import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { makeDisposable } from "@/shared/disposable";
import { addTensorWithBoundaryHash } from "@/shared/game/resources/tensor_boundary_hashes";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import type * as Shards from "@/shared/game/shard";
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
import type { FloraIndex } from "@/shared/wasm/types/galois";

import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";

interface FloraOnlyResourcePaths {
  "/terrain/flora/index": PathDef<[], FloraIndex>;
  "/terrain/flora/tensor": PathDef<[Shards.ShardId], Optional<Tensor<"U32">>>;
  "/terrain/flora/tensor/boundary_hashes": PathDef<
    [Shards.ShardId],
    Promise<Optional<TensorBoundaryHashes>>
  >;
}

export type FloraResourcePaths = FloraOnlyResourcePaths & TerrainResourcePaths;
export type FloraResourceDeps = TypedResourceDeps<FloraResourcePaths>;

export type FloraResources = TypedResources<FloraResourcePaths>;
type FloraResourcesBuilder = BiomesResourcesBuilder<FloraResourcePaths>;

export async function loadFloraIndex(voxeloo: VoxelooModule) {
  const config = await jsonFetch<{ index: string }>(
    resolveAssetUrl("indices/florae")
  );

  const ret = new voxeloo.FloraIndex();
  ret.load(config.index);
  return ret;
}

function genFloraTensor(
  voxeloo: VoxelooModule,
  deps: FloraResourceDeps,
  shardId: Shards.ShardId
) {
  const tensor = deps.get("/terrain/tensor", shardId);
  if (!tensor) {
    return;
  }

  const ret = new Tensor(voxeloo, voxeloo.toFloraTensor(tensor.cpp));
  return makeDisposable(ret, () => {
    ret.delete();
  });
}

export async function addSharedFloraResources(
  voxeloo: VoxelooModule,
  builder: FloraResourcesBuilder
) {
  addTensorWithBoundaryHash(builder, "/terrain/flora/tensor", (deps, shard) =>
    genFloraTensor(voxeloo, deps, shard)
  );
  // We load the flora index up front.
  builder.addGlobal("/terrain/flora/index", await loadFloraIndex(voxeloo));
}
