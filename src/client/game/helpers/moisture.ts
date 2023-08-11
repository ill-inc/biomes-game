import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import * as Shards from "@/shared/game/shard";
import { floor } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";

export function moistureAt(
  resources: ClientResources | ClientReactResources,
  worldPos: ReadonlyVec3
): number | undefined {
  const pos = floor(worldPos);
  const shardId = Shards.voxelShard(...pos);
  const blockPos = Shards.blockPos(...pos);
  const moisture = resources
    .get("/terrain/moisture", shardId)
    ?.get(...blockPos);
  return moisture;
}
