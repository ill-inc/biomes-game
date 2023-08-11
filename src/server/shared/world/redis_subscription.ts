import type { LazyChange } from "@/server/shared/ecs/lazy";
import { LazyChangeBuffer } from "@/server/shared/ecs/lazy";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import type { WorldUpdate } from "@/server/shared/world/api";
import type { FilterContext } from "@/server/shared/world/filter_context";
import type { BiomesLuaRedis } from "@/server/shared/world/lua/api";
import { INITIAL_BOOTSTRAP_CURSOR } from "@/server/shared/world/lua/bootstrap";
import { deserializeRedisEcsUpdate } from "@/server/shared/world/lua/serde";
import {
  subscriptionCount,
  subscriptionLag,
} from "@/server/shared/world/stats";
import type { RedisStreamId } from "@/server/shared/world/types";
import {
  ECS_STREAM,
  FIRST_STREAM_ID,
  START_CURSOR,
  isPointAtOrAfter,
  streamIdAge,
} from "@/server/shared/world/types";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { sleep } from "@/shared/util/async";

const receivedChanges = createCounter({
  name: "world_subscription_received_changes",
  help: "Number of changes received from Redis",
});

const aggregatedChanges = createCounter({
  name: "world_subscription_aggregated_changes",
  help: "Number of changes received from Redis, after batching aggregation",
});

const postFilterChanges = createCounter({
  name: "world_subscription_post_filter_changes",
  help: "Number of changes received from Redis, after filtering",
});

const flushes = createCounter({
  name: "world_subscription_flushes",
  help: "Number of flush events",
});

const filterTimeMs = createCounter({
  name: "world_subscription_filter_time_ms",
  help: "Amount of time spent filtering",
});

export class RedisWorldSubscription {
  private readonly buffer = new LazyChangeBuffer();
  private lastFlush = new Timer(TimerNeverSet);

  private constructor(
    private readonly redis: BiomesRedis<BiomesLuaRedis>,
    private readonly filterContext: FilterContext | undefined,
    private readonly skipBootstrap: boolean
  ) {}

  static async create(
    redis: BiomesRedis<BiomesLuaRedis>,
    config?: {
      filter?: FilterContext;
      skipBootstrap?: boolean;
    }
  ) {
    try {
      return new RedisWorldSubscription(
        redis,
        config?.filter,
        config?.skipBootstrap ?? false
      );
    } catch (error) {
      log.error("Failed to create subscription", { error });
      throw error;
    }
  }

  private get shouldFlush() {
    return (
      this.buffer.size > CONFIG.redisMaxChangesPerUpdate ||
      (!this.buffer.empty &&
        this.lastFlush.elapsed > 1000 / CONFIG.redisMinUpdateHz)
    );
  }

  private async flush(): Promise<WorldUpdate> {
    let changes = this.buffer.pop();
    flushes.inc();
    aggregatedChanges.inc(changes.length);
    if (this.filterContext) {
      const timer = new Timer();
      changes = await this.filterContext.process(changes);
      postFilterChanges.inc(changes.length);
      filterTimeMs.inc(timer.elapsed);
    }
    this.lastFlush.reset();
    return { changes };
  }

  // Get the current stream position from the primary to account for replication
  // delays.
  private async mark(signal: AbortSignal): Promise<RedisStreamId | undefined> {
    while (!signal.aborted) {
      try {
        const result = await this.redis.primary.xrevrangeBuffer(
          ECS_STREAM,
          "+",
          "-",
          "COUNT",
          1
        );
        if (result.length > 0) {
          return result[0][0] as RedisStreamId;
        }
        return FIRST_STREAM_ID;
      } catch (error) {
        log.error("Redis mark error, waiting 500ms and retrying...", {
          error,
        });
        await sleep(CONFIG.redisMarkBackoffMs, signal);
      }
    }
  }

  private async *bootstrapScan(
    signal: AbortSignal
  ): AsyncIterable<WorldUpdate> {
    const lastLogMessage = new Timer();
    let totalProcessed = 0;
    let cursor = INITIAL_BOOTSTRAP_CURSOR;
    this.filterContext?.clear();
    const replica = await this.redis.pinReplica();
    while (!signal.aborted) {
      const [nextCursor, changes] = await replica.ecs.bootstrap(
        cursor,
        CONFIG.redisBootstrapBatchSize,
        this.filterContext?.compiledFilter
      );
      totalProcessed += changes.length;
      receivedChanges.inc(changes.length);
      this.buffer.push(changes);
      if (nextCursor.equals(START_CURSOR)) {
        // Scan reached the end, marked by returning the same cursor.
        log.info(`Bootstrap complete, total ${totalProcessed} entities.`);
        yield this.flush();
        return;
      } else if (this.shouldFlush) {
        yield this.flush();
      }
      cursor = nextCursor;
      if (lastLogMessage.elapsed > 1000) {
        log.info(`Loaded ${totalProcessed} entities from Redis`);
        lastLogMessage.reset();
      }
    }
  }

  private async *stream(
    from: RedisStreamId,
    signal: AbortSignal
  ): AsyncIterable<[RedisStreamId, LazyChange[]]> {
    const result = await this.redis.replica.xreadBuffer(
      "COUNT",
      CONFIG.redisMaxTicksToPull,
      "BLOCK",
      1000,
      "STREAMS",
      ECS_STREAM,
      from
    );
    if (result === null || signal.aborted) {
      return;
    }
    for (const [_stream, entries] of result) {
      for (const [id, fields] of entries) {
        const changes: LazyChange[] = [];
        for (let i = 0; i < fields.length; i += 2) {
          if (signal.aborted) {
            return;
          }
          if (!ECS_STREAM.equals(fields[i])) {
            continue;
          }
          changes.push(...deserializeRedisEcsUpdate(fields[i + 1])[1]);
        }
        receivedChanges.inc(changes.length);
        yield [id as RedisStreamId, changes];
      }
    }
  }

  async *subscribe(signal: AbortSignal): AsyncIterable<WorldUpdate> {
    subscriptionCount.inc();
    try {
      log.info("Starting Redis subscription...");
      let bootstrapComplete = false;
      let bootstrappedId: RedisStreamId | undefined;
      let fromId = await this.mark(signal);
      if (!fromId) {
        // Was aborted.
        return;
      }

      const markBootstrapComplete = async () => {
        bootstrapComplete = true;
        log.info("Streaming new changes...", {
          fromId: fromId!.toString(),
        });
        return { ...(await this.flush()), bootstrapped: true };
      };

      if (!this.skipBootstrap) {
        while (!signal.aborted) {
          log.info("Starting Redis bootstrap...", { to: fromId.toString() });
          try {
            yield* this.bootstrapScan(signal);

            // Determine the point to consider the world bootstrapped.
            bootstrappedId = await this.mark(signal);
            if (!bootstrappedId) {
              // Was aborted.
              return;
            }
            if (fromId.equals(bootstrappedId)) {
              // While bootstrapping, the world didn't change. So we're done!
              // This is rare, but can occur often in testing locally.
              yield markBootstrapComplete();
            } else {
              log.info("Catching up to Redis stream...", {
                from: fromId.toString(),
                to: bootstrappedId.toString(),
              });
            }
            break; // We succeeded, so break out of the retry loop.
          } catch (error) {
            log.error("Redis bootstrap error, waiting 500ms and retrying...", {
              error,
            });
            await sleep(CONFIG.redisBootstrapBackoffMs, signal);
          }
        }
      } else {
        log.info("Skipping Redis bootstrap...");
        try {
          yield markBootstrapComplete();
        } catch (error) {
          // This should never occur, the above method cannot throw if there is
          // no data to be bootstrapped.
          log.fatal("No-op redis bootstrap failed to flush", { error });
          throw error;
        }
      }

      while (!signal.aborted) {
        try {
          for await (const [id, changes] of this.stream(fromId, signal)) {
            subscriptionLag.set(streamIdAge(id));
            this.buffer.push(changes);
            if (!bootstrapComplete && isPointAtOrAfter(id, bootstrappedId!)) {
              yield markBootstrapComplete();
            } else if (this.shouldFlush) {
              yield this.flush();
            }
            fromId = id;
          }
          if (!this.buffer.empty) {
            yield this.flush();
          }
        } catch (error) {
          log.error("Redis stream error, waiting 500ms and retrying...", {
            error,
          });
          await sleep(CONFIG.redisStreamBackoffMs, signal);
        }
      }
    } catch (error) {
      // This should never occur, the above code should catch and retry
      // all exceptions.
      log.fatal("Redis subscription failure", { error });
      throw error;
    } finally {
      subscriptionCount.dec();
    }
  }
}
