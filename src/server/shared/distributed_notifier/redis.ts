import {
  isShardManagerNotifierKey,
  type DistributedNotifierKey,
  type Notifier,
  type NotifierEvents,
} from "@/server/shared/distributed_notifier/api";
import type { RedisPurpose } from "@/server/shared/redis/connection";
import {
  connectToRedis,
  type BiomesRedis,
} from "@/server/shared/redis/connection";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import { BackgroundTaskController, waitForAbort } from "@/shared/abort";
import { log } from "@/shared/logging";
import { Delayed, safeSetImmediate, sleep } from "@/shared/util/async";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";

function redisPurposeForNotifierKey(key: DistributedNotifierKey): RedisPurpose {
  switch (key) {
    case "bikkie":
    case "bikkie-baking-needed":
      return "bikkie";
    default:
      if (isShardManagerNotifierKey(key)) {
        return "shard-manager";
      }
      assertNever(key);
      throw new Error(`Unknown distributed notifier key: ${key}`);
  }
}

export class RedisNotifier<T extends string = string> implements Notifier<T> {
  private readonly emitter = new EventEmitter() as TypedEventEmitter<
    NotifierEvents<T>
  >;
  private readonly controller = new BackgroundTaskController();
  private startedWatch = false;
  private lastSeen: T | null = null;

  constructor(
    private readonly key: DistributedNotifierKey,
    private redis?: BiomesRedis // For tests
  ) {}

  get redisKey() {
    return `notifier:${this.key}`;
  }

  private async connect(): Promise<BiomesRedis> {
    if (!this.redis) {
      ok(!this.controller.aborted, "Notifier is aborted");
      const purpose = redisPurposeForNotifierKey(this.key);
      ok(purpose, `No Redis purpose for distributed notifier key: ${this.key}`);
      this.redis = await connectToRedis(purpose);
    }
    return this.redis;
  }

  private start() {
    if (this.startedWatch) {
      return;
    }
    this.startedWatch = true;
    this.controller.runInBackground("watch", (signal) => this.watch(signal));
  }

  private observe(value: T | null) {
    if (value !== null && this.lastSeen !== value) {
      this.lastSeen = value;
      this.emitter.emit("change", value);
    }
  }

  async fetch() {
    const redis = await this.connect();
    this.observe((await redis.replica.get(this.key)) as T | null);
    return this.lastSeen ?? undefined;
  }

  private async watch(signal: AbortSignal) {
    let sub: BiomesRedisConnection | undefined;
    do {
      try {
        const redis = await this.connect();
        if (!sub) {
          sub = redis.createSubscriptionConnection();
        }
        // Create a stream.
        const streamError = new Delayed<unknown>();
        sub.on("message", (channel, message) => {
          if (channel === this.key) {
            this.observe(message as T | null);
          }
        });
        sub.on("error", (error) => streamError.reject(error));
        await sub.subscribe(this.key);

        // Get the current value.
        this.observe((await redis.replica.get(this.key)) as T | null);
        await Promise.race([waitForAbort(signal), streamError.wait()]);
      } catch (error) {
        log.error("Error watching notifier", { error });
      }
    } while (await sleep(100, signal));
    sub?.disconnect("Notifier subscription ended");
  }

  async stop() {
    this.emitter.removeAllListeners();
    await this.controller.abortAndWait();
    await this.redis?.quit("Distributed notifier stopping");
    this.redis = undefined;
  }

  async notify(value: T) {
    const redis = await this.connect();
    const tx = redis.primary.multi();
    tx.set(this.key, value);
    tx.publish(this.key, value);
    await tx.exec();
  }

  on(event: "change", listener: (value: T) => void) {
    this.start();
    if (this.lastSeen !== null) {
      safeSetImmediate(() => listener(this.lastSeen!));
    }
    this.emitter.on(event, listener);
  }

  off(event: "change", listener: (value: T) => void) {
    this.emitter.off(event, listener);
  }
}
