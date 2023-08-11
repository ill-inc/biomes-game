// High frequency change world API, operates over an independent

import { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import { LazyChangeBuffer, type LazyChange } from "@/server/shared/ecs/lazy";
import { type BiomesRedis } from "@/server/shared/redis/connection";
import type {
  LeaderboardApi,
  SubscriptionConfig,
  WorldUpdate,
} from "@/server/shared/world/api";
import { WorldApi } from "@/server/shared/world/api";
import type { ReadonlyFilterContext } from "@/server/shared/world/filter_context";
import {
  ApplyMetrics,
  proposedChangeToRedis,
} from "@/server/shared/world/lua/apply";
import {
  deserializeRedisEcsUpdate,
  packForRedis,
} from "@/server/shared/world/lua/serde";
import { biomesIdToRedisKey } from "@/server/shared/world/types";
import { BackgroundTaskController, chain, waitForAbort } from "@/shared/abort";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import type { BiomesId } from "@/shared/ids";
import { safeParseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import { ConditionVariable, Delayed, sleep } from "@/shared/util/async";
import { compact, isEmpty } from "lodash";

function notSupported(): never {
  throw new Error("Not supported on HFC Redis");
}

export const ECS_PUBSUB_KEY = Buffer.from("ecs");

const applyMetrics = new ApplyMetrics("hfc");

export type HfcSubscriptionConfig = SubscriptionConfig & {
  externalFilterContext?: ReadonlyFilterContext;
};

function checkIsValidHfcConfig(config?: HfcSubscriptionConfig) {
  if (!config) {
    return;
  }
  if (config.filter && !config.externalFilterContext) {
    throw new Error("HFC must be provided an external filter context.");
  }
}

// Redis instance with a different sync protocol focused on high frequency changes.
// We do not support the leaderboard, event publishing, or any transactions. We don't
// support transactions as the components are frequently changing so would typically
// fail.
export class HfcWorldApi extends WorldApi {
  private readonly controller = new BackgroundTaskController();
  private lamport = Date.now();

  constructor(private readonly redis: BiomesRedis) {
    super();
  }

  get now() {
    this.lamport = Math.max(this.lamport + 1, Date.now());
    return this.lamport;
  }

  async healthy(): Promise<boolean> {
    try {
      return await this.redis.ping();
    } catch (error) {
      log.error("Error checking Redis health", {
        error,
      });
      return false;
    }
  }

  leaderboard(): LeaderboardApi {
    notSupported();
  }

  private async *bootstrap(signal: AbortSignal): AsyncIterable<LazyChange[]> {
    const lastLogMessage = new Timer();
    const buffer = new LazyChangeBuffer();
    let totalProcessed = 0;
    let cursor = "0";
    const replica = await this.redis.pinReplica();
    while (!signal.aborted) {
      const [nextCursor, keys] = await replica.scan(cursor);
      const ids = compact(keys.map((k) => safeParseBiomesId(k)));
      if (ids.length > 0) {
        totalProcessed += ids.length;
        const results = await this._getWithVersion(ids);
        for (const [idx, [tick, entity]] of results.entries()) {
          if (entity) {
            buffer.push([{ kind: "create", tick, entity }]);
          } else {
            buffer.push([{ kind: "delete", tick, id: ids[idx] }]);
          }
        }
      }
      if (buffer.size > CONFIG.redisHfcBootstrapBatchSize) {
        yield buffer.pop();
      }
      if (nextCursor === "0") {
        log.info(`HFC Bootstrap complete, total ${totalProcessed} entities.`);
        if (!buffer.empty) {
          yield buffer.pop();
        }
        return;
      }
      cursor = nextCursor;
      if (lastLogMessage.elapsed > 1000) {
        log.info(`HFC Loaded ${totalProcessed} entities from Redis`);
        lastLogMessage.reset();
      }
    }
  }

  async *subscribe(
    config?: HfcSubscriptionConfig,
    inputSignal?: AbortSignal
  ): AsyncIterable<WorldUpdate> {
    checkIsValidHfcConfig(config);

    const controller = new BackgroundTaskController();
    chain(controller, inputSignal, this.controller);
    const buffer = new LazyChangeBuffer();
    const cv = new ConditionVariable();
    let bootstrapped = false;
    controller.runInBackground("aggregate-changes", async (signal) => {
      // Take the change stream from redis and dump it into the provided buffer.
      // The Redis client once subscribed is in 'subscribe' mode and cannot be used for
      // other purposes.
      const sub = this.redis.createSubscriptionConnection();
      while (!signal.aborted) {
        try {
          // Create the stream first.
          const streamError = new Delayed<unknown>();
          sub.on("messageBuffer", (_channel, message) => {
            try {
              const shouldSignal = buffer.empty;
              buffer.push(deserializeRedisEcsUpdate(message)[1]);
              if (shouldSignal) {
                cv.signal();
              }
            } catch (error) {
              log.error("Error passing streamed message, ignoring.", {
                error,
              });
            }
          });
          sub.on("error", (error) => streamError.reject(error));
          await sub.subscribe(ECS_PUBSUB_KEY);

          // Bootstrap if needed.
          if (!config?.skipBootstrap) {
            for await (const changes of this.bootstrap(signal)) {
              buffer.push(changes);
            }
            if (signal.aborted) {
              break;
            }
            bootstrapped = true;
            cv.signal();
          }

          // Wait for either an abort or a stream error.
          await Promise.race([waitForAbort(signal), streamError.wait()]);
        } catch (error) {
          log.error("Error while subscribed to HFC World", { error });
          await sleep(CONFIG.chatRedisSubscribeBackoffMs, signal);
        }
      }
      sub.disconnect("HFC World subscription ended");
      cv.signal();
    });
    let sentBootstrap = false;
    // Flush takes the pending changes and processes them through the filter
    // context if provided. It then returns a WorldUpdate if there are any.
    const flush = async () => {
      let update: WorldUpdate | undefined;
      let batch = buffer.pop();
      if (batch.length) {
        if (config?.externalFilterContext) {
          batch = config.externalFilterContext.filter(batch);
        }
        if (!update) {
          update = { changes: batch };
        } else {
          update.changes = batch;
        }
      }
      if (bootstrapped && !sentBootstrap) {
        sentBootstrap = true;
        (update ??= { changes: [] }).bootstrapped = true;
      }
      return update;
    };
    while (!controller.aborted) {
      const update = await flush();
      if (!update) {
        await cv.wait();
        continue;
      }
      yield update;
    }
  }

  protected async _getWithVersion(
    ids: BiomesId[]
  ): Promise<[number, LazyEntity | undefined][]> {
    const results = await Promise.all(
      ids.map((k) => this.redis.replica.hgetall(biomesIdToRedisKey(k)))
    );
    return results.map((result, i) => [
      this.now,
      isEmpty(result) ? undefined : LazyEntity.forEncoded(ids[i], result),
    ]);
  }

  protected async _apply(
    changesToApply: ChangeToApply[]
  ): Promise<{ outcomes: ApplyStatus[]; changes: LazyChange[] }> {
    applyMetrics.observe(changesToApply);
    const tx = this.redis.primary.multi();
    const results: ApplyStatus[] = [];
    for (const cta of changesToApply) {
      if (!cta.changes?.length) {
        continue;
      }
      const now = this.now;
      results.push("success");

      const pubsub: unknown[] = [];
      for (const change of cta.changes) {
        const encoded = proposedChangeToRedis(change);
        pubsub.push(encoded);
        if (change.kind === "delete") {
          tx.del(biomesIdToRedisKey(change.id));
          continue;
        }
        for (const [componentId, value] of Object.entries(encoded[2])) {
          if (!value) {
            tx.hdel(biomesIdToRedisKey(change.entity.id), String(componentId));
          } else {
            tx.hset(
              biomesIdToRedisKey(change.entity.id),
              String(componentId),
              value as string
            );
          }
        }
      }
      tx.publish(ECS_PUBSUB_KEY, packForRedis([now, pubsub]));
    }
    await tx.exec();
    return { outcomes: results, changes: [] };
  }

  async stop() {
    await this.controller.abortAndWait();
    await this.redis.quit("HFC World shutdown");
  }
}
