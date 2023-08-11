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
import type { BlockIndex, IsomorphismTensor } from "@/shared/wasm/types/galois";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";

interface GlassOnlyResourcePaths {
  "/terrain/glass/isomorphisms": PathDef<
    [Shards.ShardId],
    Optional<IsomorphismTensor>
  >;
  "/terrain/glass/isomorphisms/boundary_hashes": PathDef<
    [Shards.ShardId],
    Promise<Optional<TensorBoundaryHashes>>
  >;
  "/terrain/glass/tensor": PathDef<[Shards.ShardId], Optional<Tensor<"U32">>>;
  "/terrain/glass/tensor/boundary_hashes": PathDef<
    [Shards.ShardId],
    Promise<Optional<TensorBoundaryHashes>>
  >;
  "/terrain/glass/index": PathDef<[], BlockIndex>;
}

export type GlassResourcePaths = GlassOnlyResourcePaths &
  IsomorphismResourcePaths &
  TerrainResourcePaths;
export type GlassResourceDeps = TypedResourceDeps<GlassResourcePaths>;

async function loadGlassIndex(voxeloo: VoxelooModule) {
  const config = await jsonFetch<{ index: string }>(
    resolveAssetUrl("indices/glass")
  );

  const ret = new voxeloo.BlockIndex();
  ret.load(config.index);
  return ret;
}

function genGlassTensor(
  voxeloo: VoxelooModule,
  deps: GlassResourceDeps,
  shardId: Shards.ShardId
) {
  const tensor = deps.get("/terrain/tensor", shardId);
  if (!tensor) {
    return;
  }

  const ret = new Tensor(voxeloo, voxeloo.toGlassTensor(tensor.cpp));
  return makeDisposable(ret, () => {
    ret.delete();
  });
}

function genGlassIsomorphisms(
  voxeloo: VoxelooModule,
  deps: GlassResourceDeps,
  shardId: Shards.ShardId
) {
  const glass = deps.get("/terrain/glass/tensor", shardId);
  if (!glass || glass.zero()) {
    return;
  }

  const isomorphisms = deps.get("/terrain/isomorphisms", shardId);

  // Generate the tensor of shape isomorphisms.
  const glassIsomorphisms = timeCode("glass:toMergedIsomorphismTensor", () => {
    return voxeloo.toMergedIsomorphismTensor(
      glass.cpp,
      isomorphisms.cpp,
      toIsomorphismId(1, 0)
    );
  });

  return makeDisposable(glassIsomorphisms, () => {
    glassIsomorphisms.delete();
  });
}

export type GlassResources = TypedResources<GlassResourcePaths>;
type GlassResourcesBuilder = BiomesResourcesBuilder<GlassResourcePaths>;

export async function addSharedGlassResources(
  voxeloo: VoxelooModule,
  builder: GlassResourcesBuilder
) {
  addTensorWithBoundaryHash(
    builder,
    "/terrain/glass/isomorphisms",
    (deps, shard) => genGlassIsomorphisms(voxeloo, deps, shard)
  );
  addTensorWithBoundaryHash(builder, "/terrain/glass/tensor", (deps, shard) =>
    genGlassTensor(voxeloo, deps, shard)
  );
  // builder.add("/terrain/glass/tensor", genGlassTensor);
  builder.addGlobal("/terrain/glass/index", await loadGlassIndex(voxeloo));
}
