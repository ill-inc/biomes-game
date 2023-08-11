import { createShardLoader } from "@/client/game/resources/shards";
import type {
  ClientResourceDeps,
  ClientResourcePaths,
} from "@/client/game/resources/types";
import type {
  HasBoundaryHashesPath,
  NeightborHashes,
} from "@/shared/game/resources/tensor_boundary_hashes";
import {
  getNeighborFaceHashes,
  neighborHashesMatch,
} from "@/shared/game/resources/tensor_boundary_hashes";
import type * as Shards from "@/shared/game/shard";
import type { Key } from "@/shared/resources/types";
import { lazyObject } from "@/shared/util/lazy";
import type { Optional } from "@/shared/util/type_helpers";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";

export type DepHashes = {
  selfTensors: number[];
  neighborTensors: NeightborHashes[];
};

export function depHashesMatch(
  a: DepHashes | undefined,
  b: DepHashes | undefined
): boolean {
  if (a === undefined) {
    return b === undefined;
  }
  if (b === undefined) {
    return false;
  }
  if (a.selfTensors.length !== b.selfTensors.length) {
    return false;
  }
  for (let i = 0; i < a.selfTensors.length; ++i) {
    if (a.selfTensors[i] != b.selfTensors[i]) {
      return false;
    }
  }

  if (a.neighborTensors.length !== b.neighborTensors.length) {
    return false;
  }
  for (let i = 0; i < a.neighborTensors.length; ++i) {
    if (!neighborHashesMatch(a.neighborTensors[i], b.neighborTensors[i])) {
      return false;
    }
  }
  return true;
}

let uniqueDepHashCount = 1;

// Useful for creating unique hashes to debug issues around hashing.
export function uniqueDepHash(): DepHashes {
  return {
    selfTensors: [uniqueDepHashCount++],
    neighborTensors: [],
  };
}

const dependentNeighborShards = [
  "/terrain/isomorphisms/dense",
  "/terrain/block/isomorphisms",
  "/terrain/glass/isomorphisms",
  "/terrain/glass/tensor",
  "/terrain/dye",
  "/lighting/sky_occlusion",
  "/lighting/irradiance",
] as const;

export async function getDepHashes<K extends Key<ClientResourcePaths>>(
  deps: ClientResourceDeps,
  selfShardId: Shards.ShardId,
  neighborShardIds: Shards.ShardId[],
  selfTensorHashPath: HasBoundaryHashesPath<ClientResourcePaths, K>
): Promise<DepHashes> {
  const [selfBoundaryHashes, neighborBoundaryHashes] = await Promise.all([
    Promise.all([
      deps.get(
        `${selfTensorHashPath}/boundary_hashes` as K,
        selfShardId
      ) as Promise<Optional<TensorBoundaryHashes>>,
      ...dependentNeighborShards.map((p) =>
        deps.get(`${p}/boundary_hashes`, selfShardId)
      ),
    ]),
    Promise.all(
      dependentNeighborShards.map((p) =>
        getNeighborFaceHashes(
          (id) => deps.get(`${p}/boundary_hashes`, id),
          neighborShardIds
        )
      )
    ),
  ]);

  return {
    selfTensors: selfBoundaryHashes.map((x) => x?.volumeHash ?? 0),
    neighborTensors: neighborBoundaryHashes,
  };
}

type PromiseDependentNeighborShards = {
  [K in (typeof dependentNeighborShards)[number]]: ReturnType<
    typeof createShardLoader<K>
  >;
};

export function getNeighborShardLoaders(
  deps: ClientResourceDeps,
  shardIds: Shards.ShardId[]
) {
  return lazyObject(
    Object.fromEntries(
      dependentNeighborShards.map((key) => [
        key,
        () => createShardLoader(deps, key, shardIds),
      ])
    )
  ) as PromiseDependentNeighborShards;
}
