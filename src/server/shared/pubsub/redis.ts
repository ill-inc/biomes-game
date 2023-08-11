import type { PubSubTopic } from "@/server/shared/pubsub/api";
import { AbstractPubSub } from "@/server/shared/pubsub/api";
import {
  connectToRedis,
  type BiomesRedis,
} from "@/server/shared/redis/connection";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import { waitForAbort } from "@/shared/abort";
import { log } from "@/shared/logging";
import { Delayed, sleep } from "@/shared/util/async";
import type { NotAPromise } from "@/shared/zrpc/serde";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";

export class RedisPubSub<T extends PubSubTopic> extends AbstractPubSub<T> {
  constructor(
    topic: T,
    private redis?: BiomesRedis // For tests
  ) {
    super(topic);
  }

  private get redisKey() {
    return `pubsub:${this.topic}`;
  }

  private async connect(): Promise<BiomesRedis> {
    if (!this.redis) {
      ok(!this.controller.aborted, "Notifier is aborted");
      this.redis = await connectToRedis("pubsub");
    }
    return this.redis;
  }

  async publish(value: NotAPromise<T>) {
    const redis = await this.connect();
    await redis.primary.publish(this.redisKey, zrpcSerialize(value));
  }

  protected async watch(signal: AbortSignal, observe: (value: any) => void) {
    let sub: BiomesRedisConnection | undefined;
    do {
      try {
        const redis = await this.connect();
        if (!sub) {
          sub = redis.createSubscriptionConnection();
        }
        // Create a stream.
        const streamError = new Delayed<unknown>();
        sub.on("messageBuffer", (_channel, message) => {
          observe(message);
        });
        sub.on("error", (error) => streamError.reject(error));
        await sub.subscribe(this.redisKey);
        await Promise.race([waitForAbort(signal), streamError.wait()]);
      } catch (error) {
        log.error("Error watching notifier", { error });
      }
    } while (await sleep(100, signal));
    sub?.disconnect("Notifier subscription ended");
  }

  async stop() {
    await super.stop();
    await this.redis?.quit("PubSub stopping");
    this.redis = undefined;
  }
}
