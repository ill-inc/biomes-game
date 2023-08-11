import { emptyFilter } from "@/server/shared/ecs/filter";
import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import type {
  LeaderboardApi,
  SubscriptionConfig,
  WorldUpdate,
} from "@/server/shared/world/api";
import { WorldApi } from "@/server/shared/world/api";
import { FilterContext } from "@/server/shared/world/filter_context";
import type { BiomesLuaRedis } from "@/server/shared/world/lua/api";
import { deserializeRedisEntityState } from "@/server/shared/world/lua/serde";
import { RedisLeaderboard } from "@/server/shared/world/redis_leaderboard";
import { RedisWorldSubscription } from "@/server/shared/world/redis_subscription";
import { ECS_STREAM, biomesIdToRedisKey } from "@/server/shared/world/types";
import { BackgroundTaskController } from "@/shared/abort";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { sleep } from "@/shared/util/async";
import { chunk } from "@/shared/util/collections";
import { ClientRequestStatRecorder } from "@/shared/zrpc/client_stats";
import * as grpc from "@/shared/zrpc/grpc";

export class RedisWorld extends WorldApi {
  private readonly controller = new BackgroundTaskController();
  private startedPeriodicTrim = false;

  constructor(private readonly redis: BiomesRedis<BiomesLuaRedis>) {
    super();
  }

  private async periodicTrim(signal: AbortSignal) {
    while (await sleep(CONFIG.redisPeriodicTrimIntervalMs, signal)) {
      if (Math.random() > CONFIG.redisPeriodicTrimChance) {
        continue;
      }
      const trimStyle = (CONFIG.redisUseApproximateTrim ? "~" : "=") as any;
      const maxAgeMs = Date.now() - CONFIG.redisMaxEcsLogAgeMs;
      try {
        const pipeline = this.redis.primary.pipeline();
        pipeline.xtrim(ECS_STREAM, "MINID", trimStyle, maxAgeMs);
        await pipeline.exec();
      } catch (error) {
        log.warn("Failed to trim ECS stream", { error });
      }
    }
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
    return new RedisLeaderboard(this.redis);
  }

  protected async _apply(
    changesToApply: ChangeToApply[]
  ): Promise<{ outcomes: ApplyStatus[]; changes: LazyChange[] }> {
    if (!this.startedPeriodicTrim) {
      this.startedPeriodicTrim = true;
      this.controller.runInBackground("periodicTrim", (signal) =>
        this.periodicTrim(signal)
      );
    }
    const results = {
      outcomes: [] as ApplyStatus[],
      changes: [] as LazyChange[],
    };
    for (const batch of chunk(
      changesToApply,
      CONFIG.redisMaxTransactionsPerApply
    )) {
      const recorder = new ClientRequestStatRecorder("/world/apply");
      try {
        const [outcomes, changes] = await this.redis.primary.ecs.apply(batch);
        recorder.gotResponse();
        results.outcomes.push(...outcomes);
        results.changes.push(...changes);
      } catch (error) {
        log.error("Error applying changes", {
          error,
        });
        recorder.error(grpc.status.INTERNAL);
        throw error;
      } finally {
        recorder.end();
      }
    }
    return results;
  }

  protected async _getWithVersion(
    ids: BiomesId[]
  ): Promise<[number, LazyEntity | undefined][]> {
    const recorder = new ClientRequestStatRecorder("/world/get");
    try {
      const result = await this.redis.replica.mgetBuffer(
        ids.map((id) => biomesIdToRedisKey(id))
      );
      const output = [];
      for (let i = 0; i < ids.length; ++i) {
        output.push(deserializeRedisEntityState(ids[i], result[i]));
      }
      return output;
    } catch (error) {
      log.error("Error getting entities", {
        error,
      });
      recorder.error(grpc.status.INTERNAL);
      throw error;
    } finally {
      recorder.end();
    }
  }

  subscribe(
    config?: SubscriptionConfig,
    signal?: AbortSignal
  ): AsyncIterable<WorldUpdate> & { filterContext?: FilterContext } {
    const filterContext = emptyFilter(config?.filter)
      ? undefined
      : new FilterContext(this.redis.replica, config!.filter!);
    const generator = this.controller.runGenerator(
      "world.subscribe",
      async (signal) =>
        (
          await RedisWorldSubscription.create(this.redis, {
            ...config,
            filter: filterContext,
          })
        ).subscribe(signal),
      undefined,
      signal
    );
    (generator as any).filterContext = filterContext;
    return generator;
  }

  async stop() {
    this.controller.abort();
    await this.redis.quit("RedisWorld stopping");
    await this.controller.wait();
  }
}
