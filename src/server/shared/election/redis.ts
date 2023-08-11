import type { Election, ElectionCampaign } from "@/server/shared/election/api";
import {
  connectToRedis,
  type BiomesRedis,
} from "@/server/shared/redis/connection";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import { loadLuaScript } from "@/server/shared/world/lua/api";
import { BackgroundTaskController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { Latch, sleep } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { ok } from "assert";

export class RedisElection implements Election {
  private readonly nonce = autoId();
  private readonly lastSuccessfulKeepalive = new Timer(TimerNeverSet);
  private loadedLua = false;

  // Public for tests.
  constructor(
    private readonly redis: BiomesRedis,
    public readonly campaign: ElectionCampaign
  ) {}

  static async create(campaign: ElectionCampaign) {
    return new RedisElection(await connectToRedis("election"), campaign);
  }

  get redisKey() {
    return `election:${this.campaign}`;
  }

  // Obtain or extend the leadership, return true if we are the leader.
  // Passing a TTL of zero will remove the leadership.
  private async keepalive(value: string, ttl: number): Promise<boolean> {
    if (!this.loadedLua) {
      await loadLuaScript(
        this.redis.primary,
        "election.keepalive",
        "election.keepalive.lua"
      );

      this.loadedLua = true;
    }
    const result = await (this.redis.primary as any)["election.keepalive"](
      1,
      this.redisKey,
      this.nonce,
      value,
      ttl
    );
    if (result === "OK") {
      this.lastSuccessfulKeepalive.reset();
      return true;
    } else {
      this.lastSuccessfulKeepalive.reset(TimerNeverSet);
      return false;
    }
  }

  get isLeader() {
    return this.lastSuccessfulKeepalive.elapsed < CONFIG.electionTtlMs;
  }

  // Return the current leader's published value, this can be
  // empty if no one is currently elected.
  async getElectedValue(): Promise<string> {
    const result = await this.redis.primary.hgetall(this.redisKey);
    const keys = Object.keys(result);
    if (keys.length === 0) {
      return "";
    }
    return result[keys[0]];
  }

  private async waitForLeadershipAttempt(signal: AbortSignal) {
    let sub: BiomesRedisConnection | undefined;
    try {
      if (!sub) {
        sub = this.redis.createSubscriptionConnection();
      }
      const latch = new Latch();

      // Create a stream.
      sub.on("messageBuffer", () => latch.signal());
      sub.on("error", (error) => {
        log.error("Error in redis election", { error });
        latch.signal();
      });
      await sub.subscribe(this.redisKey);

      void sleep(CONFIG.electionTtlMs / 3, signal).then(() => latch.signal());

      // Wait for a message, error, or timeout.
      await latch.wait();
    } catch (error) {
      log.error("Error waiting for leadership ", { error });
    }
    sub?.disconnect("Election subscription ended");
  }

  async waitUntilElected<T>(
    value: string,
    fn: (signal: AbortSignal) => Promise<T>,
    signal: AbortSignal
  ): Promise<T> {
    ok(!this.isLeader, "Cannot call waitUntilElected twice");

    let gotError: any | undefined = undefined;

    // Attempt to become the leader forever retrying.
    do {
      try {
        // Attempt to become the leader.
        if (!(await this.keepalive(value, CONFIG.electionTtlMs))) {
          // We didn't become the leader, wait and try.
          await this.waitForLeadershipAttempt(signal);
          continue;
        }

        // We are now the leader.
        const controller = new BackgroundTaskController().chain(signal);

        // Run a keepalive ping periodically.
        controller.runInBackground("keepalive", async (signal) => {
          while (await sleep(CONFIG.electionTtlMs / 3, signal)) {
            try {
              await this.keepalive(value, CONFIG.electionTtlMs);
            } catch (error) {
              log.error("Error extending leadership", { error });
            }
            if (!this.isLeader) {
              // No longer the leader! Abandon things.
              controller.abort();
            }
          }
        });

        // Run the function.
        try {
          return await fn(controller.signal);
        } catch (error) {
          // Don't loop on function exceptions, let the caller handle it.
          gotError = error;
          break;
        } finally {
          // Kill the keepalive
          controller.abort();
        }
      } finally {
        // Make sure when leaving to release the leadership if we had it.
        await this.keepalive("", 0);
      }
    } while (!signal.aborted);

    // If we get here we've been aborted, or an exception thrown.
    if (gotError !== undefined) {
      throw gotError;
    }
    return fn(signal);
  }
}
