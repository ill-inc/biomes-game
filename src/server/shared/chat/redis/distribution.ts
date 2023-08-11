import { sendWebPushMessages } from "@/server/chat/push/web";
import type { PlayerSpatialObserver } from "@/server/shared/chat/player_observer";
import {
  EXTENDED_DELIVERY_STREAM_KEY,
  deserializeRedisDeliveries,
} from "@/server/shared/chat/redis/common";
import { CompactionThrottle } from "@/server/shared/chat/redis/compaction";
import type { AnyPreparedDelivery } from "@/server/shared/chat/redis/delivery";
import { PreparedDelivery } from "@/server/shared/chat/redis/delivery";
import { determineSpatialTargets, shouldPush } from "@/server/shared/chat/util";
import type { DiscordBot } from "@/server/shared/discord";
import { getGitEmail } from "@/server/shared/git";
import { generateNonce } from "@/server/shared/nonce";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import { connectToRedis } from "@/server/shared/redis/connection";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import {
  idleConsumerGroups,
  pendingGroupMessages,
} from "@/server/shared/redis/util";
import type { BDB } from "@/server/shared/storage";
import {
  FIRST_STREAM_ID,
  type RedisStreamId,
} from "@/server/shared/world/types";
import type { ServerCache } from "@/server/web/server_cache";
import type { Envelope } from "@/shared/chat/types";
import { type Delivery } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import {
  ConditionVariable,
  SignallingValue,
  asyncAllPooled,
  sleep,
} from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { DefaultMap, chunk } from "@/shared/util/collections";
import { type RedisValue } from "ioredis";
import { serializeError } from "serialize-error";

const chatSpatialInMessages = createCounter({
  name: "chat_spatial_in_messages",
  help: "Number of chat messages distributed spatially",
});

const chatSpatialOutMessages = createCounter({
  name: "chat_spatial_out_messages",
  help: "Number of chat messages distributed spatially",
});

const chatSpatialErrors = createCounter({
  name: "chat_spatial_distribution_errors",
  help: "Number of failures to distribute spatially",
});

const chatPushMessages = createCounter({
  name: "chat_push_messages",
  help: "Number of chat messages pushed",
});

const chatPushErrors = createCounter({
  name: "chat_push_errors",
  help: "Number of failures to push",
});

const chatPendingMessages = createGauge({
  name: "chat_pending_messages",
  help: "Number of pending chat messages to be distributed",
});

interface PushContext {
  serverCache: ServerCache;
  discordBot?: {
    sendPushNotifications: (
      userId: BiomesId,
      mail: Envelope[]
    ) => Promise<void>;
  };
  db?: BDB; // No web pushes without this.
}

// Chat distributor listens to a stream of messages that require extended delivery,
// then it distributes them spatially as needed (and potentially triggers push
// notifications).
export class RedisChatDistributor {
  // Solely for tests where we need to wait on distribution or push.
  public readonly distributions = new SignallingValue(
    0,
    new ConditionVariable()
  );
  private readonly pendingPush = new Map<string, Envelope>();
  private readonly compaction: CompactionThrottle;

  private constructor(
    private readonly players: PlayerSpatialObserver,
    private readonly pushContext: PushContext | undefined,
    private readonly redis: BiomesRedisConnection,
    private readonly group: string,
    private readonly consumer: string
  ) {
    this.compaction = new CompactionThrottle(redis);
  }

  static async create(
    players: PlayerSpatialObserver,
    pushContext: PushContext | undefined,
    group: string,
    redis?: BiomesRedis
  ) {
    const consumer = generateNonce();
    const conn = (redis ?? (await connectToRedis("chat"))).primary;
    try {
      await conn.xgroup(
        "CREATE",
        EXTENDED_DELIVERY_STREAM_KEY,
        group,
        "$",
        "MKSTREAM"
      );
    } catch (error) {
      // Ignore the error, it's probably fine [due to it already existing].'
      log.warn("Probably ignorable error creating group", { error });
    }
    return new RedisChatDistributor(
      players,
      pushContext,
      conn,
      group,
      consumer
    );
  }

  async stop() {
    await this.compaction.stop();

    // Attempt to cleanup the consumer group by deleting it if empty.
    try {
      await this.cleanupGroupConsumers();
    } catch (error) {
      log.error("Failed to cleanup chat distributor", {
        error,
        group: this.group,
        consumer: this.consumer,
      });
    }
  }

  private async cleanupGroupConsumers() {
    const idle = await idleConsumerGroups(
      this.redis,
      EXTENDED_DELIVERY_STREAM_KEY,
      this.group,
      CONFIG.chatRedisIdleConsumerGroupMs
    );
    if (idle.length === 0) {
      return;
    }
    log.info("Cleaning up idle consumer groups", { idle });
    await Promise.all(
      idle.map((name) =>
        this.redis.xgroup(
          "DELCONSUMER",
          EXTENDED_DELIVERY_STREAM_KEY,
          this.group,
          name
        )
      )
    );
  }

  // Get the pending messages count, will also update the gauge.
  async getPendingMessagesCount(): Promise<number | undefined> {
    try {
      const pending = await pendingGroupMessages(
        this.redis,
        EXTENDED_DELIVERY_STREAM_KEY,
        this.group
      );
      chatPendingMessages.set(pending);
      return pending;
    } catch (error) {
      log.warn("Could not update pending messages gauge", { error });
    }
  }

  private makeAcker(acks: RedisStreamId[]): () => Promise<void> {
    return async () => {
      if (acks.length > 0) {
        await this.redis.xack(
          EXTENDED_DELIVERY_STREAM_KEY,
          this.group,
          ...acks
        );
      }
    };
  }

  private async getMissedDeliveries(): Promise<{
    deliveries: Delivery[];
    ack: () => Promise<void>;
  }> {
    const ackIds: RedisStreamId[] = [];
    const deliveries: Delivery[] = [];
    try {
      const [, items] = await this.redis.xautoclaimBuffer(
        EXTENDED_DELIVERY_STREAM_KEY,
        this.group,
        this.consumer,
        CONFIG.chatRedisDistributorTtlSecs,
        "0-0",
        "COUNT",
        CONFIG.chatRedisDistributorFetchSize
      );
      for (const [id, fields] of items as [RedisStreamId, Buffer[]][]) {
        ackIds.push(id);
        deliveries.push(...deserializeRedisDeliveries(fields));
      }
    } catch (error) {
      log.warn("Failed to get missed deliveries", { error });
      throw error;
    }
    return { deliveries, ack: this.makeAcker(ackIds) };
  }

  private async getMyDeliveries(fromId: RedisValue): Promise<{
    deliveries: Delivery[];
    ack: () => Promise<void>;
    toId?: RedisStreamId;
  }> {
    const ackIds: RedisStreamId[] = [];
    const deliveries: Delivery[] = [];
    try {
      const result = await this.redis.xreadgroupBuffer(
        "GROUP",
        this.group,
        this.consumer,
        "COUNT",
        CONFIG.chatRedisDistributorFetchSize,
        "BLOCK",
        1000,
        "STREAMS",
        EXTENDED_DELIVERY_STREAM_KEY,
        fromId
      );
      if (result !== null) {
        const [[, items]] = result;
        for (const [id, fields] of items as [RedisStreamId, Buffer[]][]) {
          ackIds.push(id);
          deliveries.push(...deserializeRedisDeliveries(fields));
        }
      }
    } catch (error) {
      log.error("Failed to get my deliveries", { error });
      throw error;
    }
    return {
      deliveries,
      ack: this.makeAcker(ackIds),
      toId: ackIds.length > 0 ? ackIds[ackIds.length - 1] : undefined,
    };
  }

  // Aggregate work by user.
  private aggregateDeliveries(
    deliveries: Delivery[]
  ): [
    inMessages: number,
    outMessages: number,
    workByTarget: DefaultMap<BiomesId, AnyPreparedDelivery[]>
  ] {
    let inMessages = 0;
    let outMessages = 0;
    const workByTarget = new DefaultMap<BiomesId, AnyPreparedDelivery[]>(
      () => []
    );
    for (const { channelName, mail, unsend } of deliveries) {
      if (mail) {
        inMessages += mail.length;
        for (const envelope of mail) {
          const targets = determineSpatialTargets(this.players, envelope);
          outMessages += targets.size;
          for (const target of targets) {
            workByTarget
              .get(target)
              .push(new PreparedDelivery(channelName, envelope, "mail"));
          }
        }
      }
      if (unsend) {
        inMessages += unsend.length;
        for (const envelope of unsend) {
          const targets = determineSpatialTargets(this.players, envelope);
          outMessages += targets.size;
          for (const target of targets) {
            workByTarget
              .get(target)
              .push(new PreparedDelivery(channelName, envelope, "unsend"));
          }
        }
      }
    }
    return [inMessages, outMessages, workByTarget];
  }

  private maybeEnqueuePushes(deliveries: Delivery[]) {
    if (!this.pushContext) {
      return;
    }
    for (const delivery of deliveries) {
      if (!delivery.mail) {
        continue;
      }
      for (const envelope of delivery.mail) {
        if (shouldPush(delivery.channelName, envelope)) {
          this.pendingPush.set(envelope.id, envelope);
        }
      }
    }
  }

  private async distribute(deliveries: Delivery[]) {
    const [inMessages, outMessages, workByTarget] =
      this.aggregateDeliveries(deliveries);

    if (!outMessages) {
      return;
    }

    const sorted = Array.from(workByTarget.entries()).sort(
      ([a], [b]) =>
        this.players.getTimeSinceLastUpdate(a) -
        this.players.getTimeSinceLastUpdate(b)
    );

    await asyncAllPooled(
      sorted,
      async ([target, deliveries]) => {
        for (const batch of chunk(
          deliveries,
          CONFIG.chatRedisDistributorBatchSize
        )) {
          const tx = this.redis.multi();
          for (const delivery of batch) {
            delivery.deliver(tx, target);
          }
          await tx.exec();
        }
        this.compaction.maybeCompact(target);
      },
      CONFIG.chatRedisDistributorBatchSize
    );
    // Only increment counters after success.
    chatSpatialInMessages.inc(inMessages);
    chatSpatialOutMessages.inc(outMessages);

    this.distributions.value += outMessages;
  }

  private async pushAndDistribute(deliveries: Delivery[]) {
    this.maybeEnqueuePushes(deliveries);
    await this.distribute(deliveries);
  }

  private async flushPushes() {
    if (this.pendingPush.size === 0) {
      return;
    }
    const batch = Array.from(this.pendingPush.values());
    this.pendingPush.clear();
    if (!this.pushContext) {
      return;
    }

    // Check if the cached nonces match this round, if so we're to
    // deliver now. Otherwise they were delivered before.
    const nonce = autoId();
    const nonces = await this.pushContext.serverCache.getOrComputeManySame(
      CONFIG.chatPushNonceTtlSecs,
      "pushNonces",
      batch.map((e) => [e.to!, e.id, async () => nonce])
    );

    // Group all pushes by target.
    const groupByTarget = new DefaultMap<BiomesId, Envelope[]>(() => []);
    for (const envelope of batch.filter((_, i) => nonces[i] === nonce)) {
      if (envelope.to) {
        groupByTarget.get(envelope.to).push(envelope);
        chatPushMessages.inc();
      }
    }
    if (!groupByTarget.size) {
      return;
    }

    // Queue up the work to try, all errors will be ignored.
    const work: Promise<unknown>[] = [];
    const enqueue = (p: Promise<unknown>) =>
      work.push(
        p.catch((error) => {
          log.warn("Failed to send push notification", { error });
          chatPushErrors.inc();
        })
      );

    if (this.pushContext.db) {
      for (const [target, envelopes] of groupByTarget) {
        enqueue(sendWebPushMessages(this.pushContext.db, target, envelopes));
      }
    }
    if (this.pushContext.discordBot) {
      for (const [target, envelopes] of groupByTarget) {
        enqueue(
          this.pushContext.discordBot.sendPushNotifications(target, envelopes)
        );
      }
    }
    await Promise.all(work);
  }

  async runForever(signal?: AbortSignal) {
    let fromId = FIRST_STREAM_ID;
    let recovering = true;
    while (!signal?.aborted) {
      try {
        // Just to ensure the gauge is up to date.
        await this.getPendingMessagesCount();
        void this.flushPushes().catch((error) => {
          log.error("Failed to flush pushes", { error });
        });

        {
          const { deliveries, ack } = await this.getMissedDeliveries();
          await this.pushAndDistribute(deliveries);
          await ack();
          if (deliveries.length > 0) {
            continue; // Keep processing missed deliveries.
          }
        }

        {
          const { deliveries, ack, toId } = await this.getMyDeliveries(
            recovering ? fromId : ">"
          );
          await this.pushAndDistribute(deliveries);
          await ack();
          // Record progress.
          if (toId) {
            fromId = toId;
          } else {
            recovering = false;
          }
        }
      } catch (error) {
        if (serializeError(error).message?.includes("NOGROUP")) {
          // DB has been reset completely. Die.
          log.fatal(
            "Redis chat distributor group lost, exiting. This is usually due to a manual DB reset.",
            { error }
          );
        }
        log.error("Error while distributing chat messages", { error });
        chatSpatialErrors.inc();
        await sleep(CONFIG.chatRedisDistributorBackoffMs, signal);
      }
    }
  }
}

async function createSubscriptionName() {
  if (process.env.NODE_ENV !== "production") {
    // When running locally use a user-specific subscription name.
    return `${await getGitEmail()}-redis-chat-distributor`;
  }
  return `redis-chat-distributor`;
}

export async function registerRedisChatDistributor<
  C extends {
    db: BDB;
    discordBot: DiscordBot;
    playerSpatialObserver: PlayerSpatialObserver;
    serverCache: ServerCache;
  }
>(loader: RegistryLoader<C>) {
  const ctx = await loader.getAll(
    "db",
    "discordBot",
    "playerSpatialObserver",
    "serverCache"
  );
  return RedisChatDistributor.create(
    ctx.playerSpatialObserver,
    ctx,
    await createSubscriptionName()
  );
}
