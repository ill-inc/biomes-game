import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { EAGER_EXPIRATION_MS } from "@/shared/constants";
import { using } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import { addTensorWithBoundaryHash } from "@/shared/game/resources/tensor_boundary_hashes";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import * as Shards from "@/shared/game/shard";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { Optional } from "@/shared/util/type_helpers";
import { loadBlockWrapper } from "@/shared/wasm/biomes";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { ShapeIndex } from "@/shared/wasm/types/galois";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";

interface IsomorphismOnlyResourcePaths {
  "/terrain/isomorphisms": PathDef<[Shards.ShardId], Tensor<"U32">>;
  "/terrain/isomorphisms/boundary_hashes": PathDef<
    [Shards.ShardId],
    Promise<Optional<TensorBoundaryHashes>>
  >;
  "/terrain/isomorphisms/dense": PathDef<[Shards.ShardId], Tensor<"U32">>;
  "/terrain/isomorphisms/dense/boundary_hashes": PathDef<
    [Shards.ShardId],
    Promise<Optional<TensorBoundaryHashes>>
  >;
  "/terrain/shape/index": PathDef<[], ShapeIndex>;
}

export type IsomorphismResourcePaths = IsomorphismOnlyResourcePaths &
  TerrainResourcePaths;
export type IsomorphismResourceDeps =
  TypedResourceDeps<IsomorphismResourcePaths>;

export async function loadShapeIndex(voxeloo: VoxelooModule) {
  const config = await jsonFetch<{ index: string }>(
    resolveAssetUrl("indices/shapes")
  );

  const ret = new voxeloo.ShapeIndex();
  ret.load(config.index);
  return ret;
}

function genIsomorphisms(
  voxeloo: VoxelooModule,
  deps: IsomorphismResourceDeps,
  shardId: Shards.ShardId
) {
  return using(new voxeloo.SparseBlock_U32(), (shapes) => {
    const shard = deps.get("/ecs/terrain", shardId);
    if (shard) {
      loadBlockWrapper(voxeloo, shapes, shard.shard_shapes);
    }

    const eagerShapes = deps.get("/terrain/eager_shapes", shardId);
    const time = Date.now();
    for (const shape of eagerShapes.shapes) {
      if (time < shape.createdAt + EAGER_EXPIRATION_MS) {
        if (shape.isomorphism !== undefined) {
          shapes.set(...shape.position, shape.isomorphism);
        } else {
          shapes.del(...shape.position);
        }
      }
    }

    const isomorphisms = new Tensor(
      voxeloo,
      voxeloo.toIsomorphismTensor(shapes)
    );
    return makeDisposable(isomorphisms, () => {
      isomorphisms.delete();
    });
  });
}

// Shapes are stored sparsely, ignoring full blocks. This tensor is dense, with
// every block having a shape.
function genDenseIsomorphisms(
  voxeloo: VoxelooModule,
  deps: IsomorphismResourceDeps,
  shardId: Shards.ShardId
) {
  const terrain = deps.get("/terrain/tensor", shardId);
  const sparseIsomorphisms = deps.get("/terrain/isomorphisms", shardId);

  const denseIsomorphisms = (() => {
    if (!terrain || terrain.zero()) {
      return Tensor.make(voxeloo, Shards.SHARD_SHAPE, "U32");
    } else {
      return timeCode("glass:toDenseIsomorphismTensor", () => {
        return new Tensor(
          voxeloo,
          voxeloo.toDenseIsomorphismTensor(terrain.cpp, sparseIsomorphisms.cpp)
        );
      });
    }
  })();

  return makeDisposable(denseIsomorphisms, () => {
    denseIsomorphisms.delete();
  });
}

export type IsomorphismResources = TypedResources<IsomorphismResourcePaths>;
type IsomorphismResourceBuilder =
  BiomesResourcesBuilder<IsomorphismResourcePaths>;

export async function addSharedIsomorphismResources(
  voxeloo: VoxelooModule,
  builder: IsomorphismResourceBuilder
) {
  addTensorWithBoundaryHash(builder, "/terrain/isomorphisms", (deps, shard) =>
    genIsomorphisms(voxeloo, deps, shard)
  );
  addTensorWithBoundaryHash(
    builder,
    "/terrain/isomorphisms/dense",
    (deps, shard) => genDenseIsomorphisms(voxeloo, deps, shard)
  );
  builder.addGlobal("/terrain/shape/index", await loadShapeIndex(voxeloo));
}
