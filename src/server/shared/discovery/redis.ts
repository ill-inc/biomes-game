import type { ServiceDiscoveryApi } from "@/server/shared/discovery/api";
import { zValueRecord, type ValueRecord } from "@/server/shared/discovery/util";
import { generateNonce } from "@/server/shared/nonce";
import {
  connectToRedis,
  type BiomesRedis,
} from "@/server/shared/redis/connection";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import { BackgroundTaskController, chain, waitForAbort } from "@/shared/abort";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import {
  ConditionVariable,
  Delayed,
  Latch,
  PipelineBatcher,
  SignallingValue,
  safeSetImmediate,
  sleep,
} from "@/shared/util/async";
import { asyncBackoffOnAllErrors } from "@/shared/util/retry_helpers";
import { zrpcWebDeserialize, zrpcWebSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import { EventEmitter } from "events";
import { isEqual } from "lodash";

class AdvertisedValue {
  private readonly controller = new BackgroundTaskController();
  private readonly nonce = generateNonce();

  constructor(
    private readonly redis: BiomesRedis,
    private readonly redisKey: string,
    private readonly value: string
  ) {}

  // Indicate our presence
  private async keepalive(ttl: number) {
    try {
      await asyncBackoffOnAllErrors(
        async () => {
          const tx = this.redis.primary.multi();
          tx.publish(this.redisKey, "change");
          if (ttl > 0) {
            tx.hset(this.redisKey, {
              [this.nonce]: zrpcWebSerialize({
                value: this.value,
                expires: Date.now() + ttl,
              } satisfies ValueRecord),
            });
            if (CONFIG.serviceDiscoveryServiceExpirySeconds > 0) {
              tx.expire(
                this.redisKey,
                CONFIG.serviceDiscoveryServiceExpirySeconds,
                "GT"
              );
            } else {
              tx.persist(this.redisKey);
            }
          } else {
            tx.hdel(this.redisKey, this.nonce);
          }
          await tx.exec();
        },
        {
          maxAttempts: 3,
          baseMs: 500,
        }
      );
    } catch (error) {
      log.error("Failed to advertise service", { error });
    }
  }

  async start() {
    const latch = new Latch();
    this.controller.runInBackground("advertise", async (signal) => {
      do {
        await this.keepalive(CONFIG.serviceDiscoveryTtlMs);
        latch.signal();
      } while (await sleep(CONFIG.serviceDiscoveryTtlMs / 3, signal));
    });
    await latch.wait();
  }

  async stop() {
    await this.controller.abortAndWait();
    await this.keepalive(0); // Trigger deletion as the TTL is in the past.
  }
}

const SERVICE_PREFIX = "service:";

export class RedisServiceDiscovery implements ServiceDiscoveryApi {
  private readonly controller = new BackgroundTaskController();
  private readonly batcher: PipelineBatcher<never>;
  private readonly emitter = new EventEmitter();
  private readonly nextExpiryChanged = new ConditionVariable();
  private readonly nextExpiry = new SignallingValue(
    Infinity,
    this.nextExpiryChanged
  );
  private advertising: AdvertisedValue | undefined = undefined;
  private startedWatch = false;
  private seen = new Set<string>();

  // Public for tests.
  constructor(
    private readonly redis: BiomesRedis,
    public readonly service: string
  ) {
    this.batcher = new PipelineBatcher(
      () => this.refreshKnownValues(),
      1_000,
      this.controller.signal
    );
  }

  static async create(service: string) {
    return new RedisServiceDiscovery(
      await connectToRedis("service-discovery"),
      service
    );
  }

  get redisKey() {
    return `${SERVICE_PREFIX}${this.service}`;
  }

  async getKnownServices() {
    const keys = await this.redis.primary.keys(`${SERVICE_PREFIX}*`);
    return new Set(keys.map((key) => key.slice(SERVICE_PREFIX.length)));
  }

  async publish(value: string) {
    ok(this.advertising === undefined, "Can only advertise a single value");
    const ad = new AdvertisedValue(this.redis, this.redisKey, value);
    await ad.start();
    this.advertising = ad;
    await this.batcher.invalidate();
  }

  async unpublish(): Promise<void> {
    try {
      await this.advertising?.stop();
    } finally {
      this.advertising = undefined;
    }
    await this.batcher.invalidate();
  }

  async stop() {
    await this.unpublish();
    await this.controller.abortAndWait();
  }

  private async refreshKnownValues() {
    const result = await this.redis.primary.hgetall(this.redisKey);

    const now = Date.now();
    const discovered = new Set<string>();
    let nextExpiry = Infinity;
    const expired: string[] = [];
    for (const [nonce, encoded] of Object.entries(result)) {
      try {
        const record = zrpcWebDeserialize(encoded, zValueRecord);
        if (record.expires < now) {
          // It expired long enough ago we should delete it.
          expired.push(nonce);
          continue;
        }
        if (record.expires < nextExpiry) {
          nextExpiry = record.expires;
        }
        discovered.add(record.value);
      } catch (error) {
        log.warn("Ignoring invalid service discovery record", { error });
        expired.push(nonce);
      }
    }
    if (expired.length > 0) {
      // Don't block on GC.
      void this.redis.primary.hdel(this.redisKey, ...expired).catch((error) => {
        log.error("Failed to remove expired service discovery records", {
          error,
        });
      });
    }
    if (nextExpiry !== this.nextExpiry.value) {
      this.nextExpiry.value = nextExpiry;
    }
    if (isEqual(this.seen, discovered)) {
      return;
    }
    for (const value of this.seen) {
      if (!discovered.has(value)) {
        log.info(`Lost: ${value}`, { gaiaGap: true });
      }
    }
    for (const value of discovered) {
      if (!this.seen.has(value)) {
        log.info(`Found: ${value}`, { gaiaGap: true });
      }
    }
    this.seen = discovered;
    this.emitter.emit("change", this.seen);
  }

  private async watchForChanges(signal: AbortSignal) {
    do {
      let sub: BiomesRedisConnection | undefined;
      try {
        sub = this.redis.createSubscriptionConnection();
        const streamError = new Delayed<unknown>();
        sub.on("message", () => {
          void this.batcher.invalidate();
        });
        sub.on("error", (error) => streamError.reject(error));
        await sub.subscribe(this.redisKey);

        // So we don't miss anything pull after subscription.
        await this.batcher.invalidate();

        await Promise.race([waitForAbort(signal), streamError.wait()]);
      } catch (error) {
        log.error("Failed to read service discovery records", { error });
      } finally {
        sub?.disconnect("Service discovery stopped");
      }
    } while (await sleep(CONFIG.serviceDiscoveryTtlMs / 3, signal));
  }

  private async pollForChanges(signal: AbortSignal) {
    while (!signal.aborted) {
      const timer = new Timer();
      let shouldFire = false;
      while (
        !signal.aborted &&
        !shouldFire &&
        timer.elapsed < CONFIG.serviceDiscoveryTtlMs
      ) {
        // Controller just for this loop.
        const controller = new AbortController();

        // Wait for a shutdown.
        chain(controller, signal);

        // Wait for the next expiry to change, so that we can adjust
        // the sleep timer (as it may have moved sooner).
        void this.nextExpiryChanged.wait().then(() => controller.abort());

        // Or wait for the TTL of the soonest to expire value or
        // for serviceDiscoveryTtlMs.
        void sleep(
          Math.min(
            CONFIG.serviceDiscoveryTtlMs - timer.elapsed,
            this.nextExpiry.value - Date.now()
          ) + 50, // Clock skew correction.
          controller.signal
        ).then((slept) => {
          if (slept) {
            shouldFire = true;
          }
          controller.abort();
        });

        await waitForAbort(controller.signal);

        // Clear the dangling promise above.
        this.nextExpiryChanged.signal();
        // Clear the sleep
        controller.abort();
      }

      // Poll.
      await this.batcher.invalidate();
    }
  }

  private async watchIfNeeded() {
    await this.batcher.invalidate();
    if (this.startedWatch) {
      return;
    }
    this.startedWatch = true;
    this.controller.runInBackground("watch", async (signal) => {
      await this.watchForChanges(signal);
    });
    this.controller.runInBackground("poll", async (signal) => {
      await this.pollForChanges(signal);
    });
  }

  async discover(): Promise<Set<string>> {
    await this.watchIfNeeded();
    return this.seen;
  }

  on(event: "change", callback: (values: Set<string>) => void) {
    void this.watchIfNeeded();
    safeSetImmediate(() => callback(this.seen));
    this.emitter.on(event, callback);
  }

  off(event: "change", callback: (values: Set<string>) => void) {
    this.emitter.off(event, callback);
  }
}
