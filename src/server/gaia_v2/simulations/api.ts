import type { TerrainShard } from "@/server/gaia_v2/table";
import type { ChangeToApply } from "@/shared/api/transaction";
import type { Change } from "@/shared/ecs/change";
import type { ShardId } from "@/shared/game/shard";
import { z } from "zod";

export interface RequeueStatus {
  kind: "requeue";
  afterDelayMs: number;
}

export type UpdateStatus = undefined | RequeueStatus;

export type UpdateResult = {
  update?: UpdateStatus;
  changes?: ChangeToApply[];
};

export function requeueAfter(delayMs: number = 1_000): UpdateResult {
  return { update: { kind: "requeue", afterDelayMs: delayMs } };
}

export const zSimulationName = z.enum([
  "farming",
  "flora_decay",
  "flora_growth",
  "flora_muck",
  "irradiance",
  "leaf_growth",
  "lifetime",
  "muck",
  "ore_growth",
  "restoration",
  "sky_occlusion",
  "tree_growth",
  "water",
]);

export type SimulationName = z.infer<typeof zSimulationName>;

export abstract class Simulation {
  constructor(public readonly name: SimulationName) {}

  // Optionally reduce a set of shards to a narrower set.
  reduce(_shards: Set<ShardId>): void {}

  // Any shard returned from `invalidate` will be updated immediately.
  abstract invalidate(change: Change): ShardId[];
  abstract update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined>;
}
