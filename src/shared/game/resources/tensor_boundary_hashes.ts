import type * as Shards from "@/shared/game/shard";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathMap } from "@/shared/resources/path_map";
import type {
  Args,
  CreateFn,
  Key,
  Ret,
  TypedResourceDeps,
} from "@/shared/resources/types";
import type { MaybePromise } from "@/shared/util/async";
import { ifPromiseThen } from "@/shared/util/async";
import type { Optional } from "@/shared/util/type_helpers";
import type { DataType, Tensor } from "@/shared/wasm/tensors";
import { Dir } from "@/shared/wasm/types/common";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";
import { ok } from "assert";

function genTensorBoundaryHashes<
  P extends PathMap<P>,
  K extends Key<P>,
  TT extends DataType
>(
  path: K,
  deps: TypedResourceDeps<P>,
  shardId: Shards.ShardId
): MaybePromise<Optional<TensorBoundaryHashes>> {
  return ifPromiseThen(
    deps.get(path, shardId) as MaybePromise<Optional<Tensor<TT>>>,
    (tensor: Optional<Tensor<TT>>) => {
      return timeCode("tensors:boundaryHash", () => {
        return tensor?.boundaryHash();
      });
    }
  );
}

export type HasBoundaryHashesPath<
  P extends PathMap<P>,
  K extends Key<P>
> = `${K}/boundary_hashes` extends keyof P
  ? [Shards.ShardId] extends Args<P, `${K}/boundary_hashes`>
    ? Ret<P, `${K}/boundary_hashes`> extends
        | Promise<Optional<TensorBoundaryHashes>>
        | Optional<TensorBoundaryHashes>
      ? K
      : never
    : never
  : never;

export function addTensorWithBoundaryHash<
  P extends PathMap<P>,
  K extends Key<P>
>(
  builder: BiomesResourcesBuilder<P>,
  path: HasBoundaryHashesPath<P, K>,
  createFn: CreateFn<P, K>
) {
  builder.add(path, createFn);
  builder.add(
    `${path}/boundary_hashes` as K,
    ((deps: TypedResourceDeps<P>, shardId: Shards.ShardId) =>
      genTensorBoundaryHashes(path, deps, shardId)) as any
  );
}

// For a given index into a neighboring shard array (with diagonals), returns
// the face/edge/corner of that tensor that is adjacent to the center shard. If
// more than one "face" appears in an entry, it indicates instead that either an
// edge (defined by 2 faces) or corner (defined by 3 faces) is adjacent.
const DIAGONAL_NEIGHBOR_INDICES_TO_FACE_DIRS: readonly Dir[][] = [
  // z = -1
  [Dir.Z_POS, Dir.Y_POS, Dir.X_POS],
  [Dir.Z_POS, Dir.Y_POS],
  [Dir.Z_POS, Dir.Y_POS, Dir.X_NEG],
  [Dir.Z_POS, Dir.X_POS],
  [Dir.Z_POS],
  [Dir.Z_POS, Dir.X_NEG],
  [Dir.Z_POS, Dir.Y_NEG, Dir.X_POS],
  [Dir.Z_POS, Dir.Y_NEG],
  [Dir.Z_POS, Dir.Y_NEG, Dir.X_NEG],

  // z = 0
  //   y = -1
  [Dir.Y_POS, Dir.X_POS],
  [Dir.Y_POS],
  [Dir.Y_POS, Dir.X_NEG],
  //   y = 0
  [Dir.X_POS],
  [Dir.X_NEG],
  //   y = +1
  [Dir.Y_NEG, Dir.X_POS],
  [Dir.Y_NEG],
  [Dir.Y_NEG, Dir.X_NEG],

  // z = +1
  [Dir.Z_NEG, Dir.Y_POS, Dir.X_POS],
  [Dir.Z_NEG, Dir.Y_POS],
  [Dir.Z_NEG, Dir.Y_POS, Dir.X_NEG],
  [Dir.Z_NEG, Dir.X_POS],
  [Dir.Z_NEG],
  [Dir.Z_NEG, Dir.X_NEG],
  [Dir.Z_NEG, Dir.Y_NEG, Dir.X_POS],
  [Dir.Z_NEG, Dir.Y_NEG],
  [Dir.Z_NEG, Dir.Y_NEG, Dir.X_NEG],
];

export type NeightborHashes = number[][];

export function getNeighborFaceHashes(
  fetchBoundaryHash: (
    id: Shards.ShardId
  ) => MaybePromise<Optional<TensorBoundaryHashes>>,
  shardIds: Shards.ShardId[]
): Promise<NeightborHashes> {
  ok(
    shardIds.length == 26,
    "Only diagonal neighbors are currently supported (but shouldn't be hard to fix if needed)."
  );
  return Promise.all(
    shardIds.map((id, i) => {
      const faceDirs = DIAGONAL_NEIGHBOR_INDICES_TO_FACE_DIRS[i];
      return ifPromiseThen(fetchBoundaryHash(id), (x) =>
        x
          ? faceDirs.map((d) => x.faceHashes[d])
          : Array(faceDirs.length).fill(0)
      );
    })
  );
}

function allDifferent(a: number[], b: number[]) {
  ok(a.length == b.length);
  for (let i = 0; i < a.length; ++i) {
    if (a[i] == b[i]) {
      return false;
    }
  }
  return true;
}

export function neighborHashesMatch(
  a: NeightborHashes,
  b: NeightborHashes
): boolean {
  ok(a.length == b.length);
  for (let i = 0; i < a.length; ++i) {
    if (allDifferent(a[i], b[i])) {
      return false;
    }
  }
  return true;
}
