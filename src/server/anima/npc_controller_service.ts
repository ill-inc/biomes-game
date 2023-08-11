import { NpcTicker } from "@/server/anima/npc_ticker";
import { GameEvent } from "@/server/shared/api/game_event";
import type { LogicApi } from "@/server/shared/api/logic";
import type { WorldApi } from "@/server/shared/world/api";
import { partitionDeltasToUpdates } from "@/server/shared/world/hfc/classify";
import { HybridWorldApi } from "@/server/shared/world/hfc/hybrid";
import type { ChangeToApply } from "@/shared/api/transaction";
import { AnimaId } from "@/shared/ecs/ids";
import type { BiomesId } from "@/shared/ids";
import { createHistogram, exponentialBuckets } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import type {
  NpcTickResourcePaths,
  NpcTickerTable,
} from "@/shared/npc/environment";
import { TickUpdates } from "@/shared/npc/updates";
import type { TypedResources } from "@/shared/resources/types";
import {
  RepeatingAsyncTimer,
  asyncYieldForEach,
  fireAndForget,
} from "@/shared/util/async";
import { DefaultMap, mapSet } from "@/shared/util/collections";
import type { VoxelooModule } from "@/shared/wasm/types";
import { chunk } from "lodash";

const npcControllerTickTimes = createHistogram({
  name: "anima_npc_controller_tick_times_ms",
  help: "Timings for the NpcControllerService.tick() method.",
  buckets: exponentialBuckets(2, 2, 8),
});

interface ShardContext {
  // Ticker to perform state changes for the shard.
  npcTicker: NpcTicker;
  // Pending applies from the last time we updated this shard.
  pendingApply: Promise<unknown> | undefined;
}

// Service to keep an constantly updating set of NPCs ticked and up-to-date.
// Most of the heavy lifting is done by NpcTicker, and this class focuses on
// managing the IO side of things, like publishing the resulting NPC update
// events and scheduling the tick timer.
export class NpcControllerService {
  private tickTimer?: RepeatingAsyncTimer;
  // For each shard, we associate with it additional runtime state on the side.
  private shardContexts: DefaultMap<number, ShardContext>;

  constructor(
    voxeloo: VoxelooModule,
    table: NpcTickerTable,
    resources: TypedResources<NpcTickResourcePaths>,
    private readonly shardIds: () => ReadonlySet<number>,
    npcsForShard: (shardId: number) => ReadonlySet<BiomesId> | undefined,
    private readonly logicApi: LogicApi,
    private readonly worldApi: WorldApi
  ) {
    this.shardContexts = new DefaultMap<number, ShardContext>(
      (s) =>
        <ShardContext>{
          npcTicker: new NpcTicker(
            voxeloo,
            table,
            resources,
            () => npcsForShard(s) ?? new Set()
          ),
          pendingApply: undefined,
        }
    );
  }

  tickDurationForShard(shardId: number) {
    return this.shardContexts.get(shardId).npcTicker.lastTickDuration;
  }

  async start() {
    this.tickTimer = new RepeatingAsyncTimer(
      () => this.tick(),
      () => CONFIG.animaNpcTickTimeMs
    );
  }

  async stop() {
    await this.tickTimer?.stop();
    this.tickTimer = undefined;
    await this.purgeUnheldShardEntries(new Set());
  }

  private async tick() {
    const timer = new Timer();
    const shardIds = this.shardIds();
    const contexts = mapSet(shardIds, (s) => this.shardContexts.get(s));

    // Await for all prior computation of these shards to complete.
    await Promise.all(contexts.map((c) => c.pendingApply));

    let updates = new TickUpdates();
    for await (const context of asyncYieldForEach(contexts, 15)) {
      updates = updates.merge(await context.npcTicker.tick());
    }
    const promise = this.applyTickUpdates(updates);

    // Mark all shards processed as pending for this update batch.
    for (const context of contexts) {
      context.pendingApply = promise;
    }
    await this.purgeUnheldShardEntries(shardIds);
    npcControllerTickTimes.observe(timer.elapsed);
  }

  private async applyTickUpdates(updates: TickUpdates): Promise<void> {
    await Promise.allSettled([
      ...chunk(updates.state, CONFIG.animaNpcTickBatchSize).map((chunk) =>
        this.applyStateChanges(chunk)
      ),
      this.logicApi.publish(
        ...updates.events.map((e) => new GameEvent(AnimaId, e))
      ),
    ]);
  }

  private applyStateChanges(updates: TickUpdates["state"]) {
    if (
      process.env.ANIMA_HFC_WRITES !== "1" ||
      !(this.worldApi instanceof HybridWorldApi)
    ) {
      if (this.worldApi instanceof HybridWorldApi) {
        // Remove any now-ignored HFC state for these NPCs
        fireAndForget(
          this.worldApi.hfc.apply({
            changes: updates.map((u) => ({
              kind: "delete",
              id: u.id,
            })),
          })
        );
      }
      return this.worldApi.apply(
        updates.map(
          (entity) =>
            <ChangeToApply>{
              iffs: [[entity.id]],
              changes: [
                {
                  kind: "update",
                  entity,
                },
              ],
            }
        )
      );
    }

    // Partition all changes into RC and HFC updates, to apply independently.
    const { rcChanges, hfcChanges } = partitionDeltasToUpdates(updates);
    const work: Promise<unknown>[] = [];
    if (rcChanges.length > 0) {
      work.push(
        this.worldApi.rc.apply(
          rcChanges.map(
            (change) =>
              <ChangeToApply>{
                iffs: [[change.entity.id]],
                changes: [change],
              }
          )
        )
      );
    }
    if (hfcChanges.length > 0) {
      work.push(
        this.worldApi.hfc.apply(<ChangeToApply>{ changes: hfcChanges })
      );
    }
    return Promise.all(work);
  }

  private async purgeUnheldShardEntries(shardIds: ReadonlySet<number>) {
    // Clean up internal context associated with shards that we no longer own.
    const discardedWork: Promise<unknown>[] = [];
    for (const [id, { pendingApply }] of this.shardContexts.entries()) {
      if (shardIds.has(id)) {
        continue;
      }
      if (pendingApply) {
        discardedWork.push(pendingApply);
      }
      this.shardContexts.delete(id);
    }
    if (discardedWork.length > 0) {
      await Promise.all(discardedWork);
    }
  }
}
