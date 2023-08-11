import type {
  ClientReactResources,
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import * as Shards from "@/shared/game/shard";
import { floor } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";

export function waterAt(
  resources: ClientResources | ClientReactResources | ClientResourceDeps,
  worldPos: ReadonlyVec3
): number | undefined {
  const pos = floor(worldPos);
  const shardId = Shards.voxelShard(...pos);
  const blockPos = Shards.blockPos(...pos);
  const water = resources.get("/water/tensor", shardId)?.get(...blockPos);
  return water;
}
