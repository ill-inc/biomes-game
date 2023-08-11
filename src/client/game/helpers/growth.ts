import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import * as Shards from "@/shared/game/shard";
import { floor } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";

export function growthAt(
  resources: ClientResources | ClientReactResources,
  worldPos: ReadonlyVec3
): number {
  const pos = floor(worldPos);
  const shardId = Shards.voxelShard(...pos);
  const blockPos = Shards.blockPos(...pos);
  const growth = resources.get("/terrain/growth", shardId).get(...blockPos);
  return growth;
}
