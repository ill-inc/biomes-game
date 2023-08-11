import type { LazyEntity, LazyEntityDelta } from "@/server/shared/ecs/gen/lazy";
import { LazyChangeBuffer, type LazyChange } from "@/server/shared/ecs/lazy";
import type {
  LeaderboardApi,
  SubscriptionConfig,
  WorldUpdate,
} from "@/server/shared/world/api";
import { WorldApi } from "@/server/shared/world/api";
import type { FilterContext } from "@/server/shared/world/filter_context";
import type { HfcWorldApi } from "@/server/shared/world/hfc/hfc";
import { BackgroundTaskController } from "@/shared/abort";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import { changedBiomesId } from "@/shared/ecs/change";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { ConditionVariable, Latch, sleep } from "@/shared/util/async";
import { DefaultMap, compactMap, takeFromSet } from "@/shared/util/collections";

// HybridWorldApi is a drop-in replacement for WorldApi that partitions and
// sends some changes to an alternative implementation, typically the HfcWorldApi.
// This is done to split apart any relatively high frequency changes that many
// clients may not care about.
export class HybridWorldApi extends WorldApi {
  private readonly controller = new BackgroundTaskController();
  constructor(public readonly rc: WorldApi, public readonly hfc: HfcWorldApi) {
    super();
  }

  async healthy(): Promise<boolean> {
    const results = await Promise.all([this.rc.healthy(), this.hfc.healthy()]);
    return results.every((r) => r);
  }

  leaderboard(): LeaderboardApi {
    return this.rc.leaderboard();
  }

  // Merged subscription from both.
  async *subscribe(
    config?: SubscriptionConfig | undefined,
    inputSignal?: AbortSignal | undefined
  ): AsyncIterable<WorldUpdate> {
    const buffer = new LazyChangeBuffer();
    const bufferChanged = new ConditionVariable();
    const controller = new BackgroundTaskController().chain(inputSignal);
    // Record the versions as-seen from the primary and use this on HFC, so that
    // a HFC version is never ahead of primary.
    const seenVersion = new DefaultMap<BiomesId, number>(() => 1 as BiomesId);
    // Wait for primary bootstrap before starting HFC.
    const bootstrapped = new Latch();

    let primaryFilterContext: FilterContext | undefined;

    // When a create occurs in rc, re-fetch the hfc value which may have
    // been overwritten by the 'rc' create. For example:
    // 1. HFC serves 'update'
    // 2. RC serves 'create' - at this point HFC is lost.
    const hfcFollowupFetch = new Set<BiomesId>();
    const hfcFollowupFetchChanged = new ConditionVariable();

    // Run the primary subscription, and record the versions it gives us.
    controller.runInBackground("primary", async (signal) => {
      const subGenerator = this.rc.subscribe(config, signal);
      primaryFilterContext = subGenerator.filterContext;
      for await (const update of subGenerator) {
        for (const change of update.changes) {
          const id = changedBiomesId(change);
          if (change.kind === "create") {
            hfcFollowupFetch.add(id);
            hfcFollowupFetchChanged.signal();
          }
          seenVersion.set(id, Math.max(seenVersion.get(id), change.tick));
        }
        buffer.push(update.changes);
        if (update.bootstrapped) {
          bootstrapped.signal();
        }
        bufferChanged.signal();
      }
      bufferChanged.signal();
      // Unblock followup on abort.
      hfcFollowupFetchChanged.signal();
    });

    // Run a HFC follow-up on the primary subscription, to re-fetch creates.
    controller.runInBackground("primary-hfc-followup", async (signal) => {
      do {
        if (!hfcFollowupFetch.size) {
          await hfcFollowupFetchChanged.wait();
        }
        if (signal.aborted || hfcFollowupFetch.size === 0) {
          return;
        }
        const batch = takeFromSet(hfcFollowupFetch, 100);
        try {
          const results = await this.hfc.get(batch);
          buffer.push(
            compactMap(results, (e) => {
              if (e) {
                return {
                  kind: "update",
                  tick: seenVersion.get(e.id),
                  entity: e as unknown as LazyEntityDelta,
                };
              }
            })
          );
          bufferChanged.signal();
          continue; // Don't yield to others, we want to re-fetch asap.
        } catch (error) {
          log.error("Error fetching HFC followup", { error });
          // Try them again later.
          for (const id of batch) {
            hfcFollowupFetch.add(id);
          }
        }
      } while (await sleep(1000, signal));
      bufferChanged.signal();
    });

    // When the primary is bootstrapped, start the HFC subscription.
    controller.runInBackground("hfc", async (signal) => {
      await bootstrapped.wait();
      for await (const update of this.hfc.subscribe(
        {
          ...config,
          externalFilterContext: primaryFilterContext,
        },
        signal
      )) {
        // HFC changes are only ever seen as updates, and capped at the
        // version seen by the primary.
        buffer.push(
          compactMap(
            update.changes,
            (change) =>
              change.kind !== "delete" && {
                kind: "update",
                tick: seenVersion.get(change.entity.id),
                entity: change.entity as LazyEntityDelta,
              }
          )
        );
        bufferChanged.signal();
      }
      bufferChanged.signal();
    });

    let sentBootstrap = false;
    while (!controller.signal.aborted) {
      if (buffer.empty) {
        await bufferChanged.wait();
      }
      const changes = buffer.pop();
      if (!sentBootstrap && bootstrapped.signalled) {
        yield { changes, bootstrapped: true };
        sentBootstrap = true;
      } else if (changes.length > 0) {
        yield { changes };
      }
    }
  }

  protected async _getWithVersion(
    ids: BiomesId[]
  ): Promise<[number, LazyEntity | undefined][]> {
    const [primary, secondary] = await Promise.all([
      this.rc.getWithVersion(ids),
      this.hfc.getWithVersion(ids),
    ]);
    return primary.map((primaryResult, i) => {
      const [primaryVersion, primaryEntity] = primaryResult;
      if (!primaryEntity) {
        return primaryResult;
      }
      const [, secondaryEntity] = secondary[i];
      if (!secondaryEntity) {
        return primaryResult;
      }
      return [primaryVersion, primaryEntity.merge(secondaryEntity)];
    });
  }

  // Note the outcome 'version' can be garbage here, it is useful to distinguish
  // it from aborted, but it doesn't represent a monotonic version from a single
  // stream, as such should not be relied upon as-such.
  // This will be removed to be a boolean in https://github.com/ill-inc/biomes/pull/12063
  protected async _apply(
    changesToApply: ChangeToApply[]
  ): Promise<{ outcomes: ApplyStatus[]; changes: LazyChange[] }> {
    const result = await this.rc.apply(changesToApply);

    // After the main apply is done, make a best effort attempt to propagate any
    // deletes here to the HFC instance. This is not blocking, and we rely on
    // the independent periodic sink service to perform corrections.
    const outcomes = result.outcomes;
    const backgroundDeletes = new Set<BiomesId>();
    for (const [idx, changeToApply] of changesToApply.entries()) {
      if (!changeToApply.changes) {
        continue;
      }
      const outcome = outcomes[idx];
      if (outcome === "success") {
        for (const change of changeToApply.changes) {
          if (change.kind === "delete") {
            backgroundDeletes.add(change.id);
          }
        }
      }
    }
    if (backgroundDeletes.size > 0) {
      this.controller.runInBackground("hfc-delete", async () => {
        await this.hfc.apply({
          changes: Array.from(backgroundDeletes).map((id) => ({
            kind: "delete",
            id,
          })),
        });
      });
    }
    return result;
  }

  async stop() {
    await Promise.all([this.rc.stop(), this.hfc.stop()]);
    await this.controller.abortAndWait();
  }
}
