import type {
  ChatApi,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
} from "@/server/shared/chat/api";
import {
  EXTENDED_DELIVERY_FIELD_NAME,
  EXTENDED_DELIVERY_STREAM_KEY,
  chatsKey,
  deserializeSingleDelivery,
} from "@/server/shared/chat/redis/common";
import {
  CompactionThrottle,
  compactDeliveries,
} from "@/server/shared/chat/redis/compaction";
import type { AnyPreparedDelivery } from "@/server/shared/chat/redis/delivery";
import { PreparedDelivery } from "@/server/shared/chat/redis/delivery";
import type {
  EnvelopeForTargetting,
  PositionProvider,
} from "@/server/shared/chat/util";
import {
  determineChannel,
  determineImmediateTargets,
  hasSpatialTargets,
  shouldPush,
  wrapInEnvelope,
} from "@/server/shared/chat/util";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import { type ChannelName, type Delivery } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { sleep } from "@/shared/util/async";
import { compactMap } from "@/shared/util/collections";
import { callbackToStream } from "@/shared/zrpc/callback_to_stream";
import { ClientRequestStatRecorder } from "@/shared/zrpc/client_stats";
import * as grpc from "@/shared/zrpc/grpc";
import { values } from "lodash";

function determineTargets(
  channelName: ChannelName,
  envelope: EnvelopeForTargetting
) {
  const immediate = determineImmediateTargets(channelName, envelope);
  if (immediate.size === 0 && !hasSpatialTargets(envelope)) {
    return "none";
  }
  return immediate;
}

export class RedisChatApi implements ChatApi {
  private readonly controller = new BackgroundTaskController();
  private readonly positionProvider: PositionProvider = {
    copyPosition: async (id) => {
      const entity = await this.worldApi.get(id);
      const pos = entity?.position()?.v;
      return pos && [...pos];
    },
  };
  private readonly compaction: CompactionThrottle;

  constructor(
    private readonly worldApi: WorldApi,
    private readonly redis: BiomesRedis
  ) {
    this.compaction = new CompactionThrottle(this.redis.primary);
  }

  async stop() {
    await this.compaction.stop();
    this.controller.abort();
    await this.redis.quit("ChatApi stopping");
    await this.controller.wait();
  }

  async healthy(): Promise<boolean> {
    try {
      return await this.redis.ping();
    } catch (error) {
      log.error("Error checking ChatApi health", {
        error,
      });
      return false;
    }
  }

  private async deliver(prepared: AnyPreparedDelivery, to: Set<BiomesId>) {
    const tx = this.redis.primary.multi();
    for (const recipient of to) {
      prepared.deliver(tx, recipient);
    }
    if (
      hasSpatialTargets(prepared.envelope) ||
      shouldPush(prepared.channelName, prepared.envelope)
    ) {
      tx.xadd(
        EXTENDED_DELIVERY_STREAM_KEY,
        "*",
        EXTENDED_DELIVERY_FIELD_NAME,
        prepared.packedDelivery
      );
    }
    await tx.exec();
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const recorder = new ClientRequestStatRecorder("/chat/sendMessage");
    try {
      const envelope = await wrapInEnvelope(request, this.positionProvider);
      const channelName = determineChannel(request);
      const targets = determineTargets(channelName, envelope);
      if (targets === "none") {
        return { id: envelope.id };
      }
      const prepared = new PreparedDelivery(channelName, envelope, "mail");
      await this.deliver(prepared, targets);

      const noteToSelf = request.from && targets.has(request.from);
      return {
        id: envelope.id,
        echo: noteToSelf ? prepared.delivery : undefined,
      };
    } catch (error) {
      recorder.error(grpc.status.INTERNAL);
      throw error;
    } finally {
      recorder.end();
    }
  }

  // Unsend a message from the chat system.
  async unsendMessage(request: UnsendMessageRequest): Promise<void> {
    const recorder = new ClientRequestStatRecorder("/chat/unsendMessage");
    try {
      const channelName = determineChannel(request);
      const targets = determineTargets(channelName, request);
      if (targets === "none") {
        return;
      }
      const prepared = new PreparedDelivery(channelName, request, "unsend");
      await this.deliver(prepared, targets);
    } catch (error) {
      recorder.error(grpc.status.INTERNAL);
      throw error;
    } finally {
      recorder.end();
    }
  }

  // Delete a particular subject from the chat system, across all messages.
  // Will be performed in the background, you cannot wait for it.
  deleteEntity(_id: BiomesId): void {
    // TODO.
  }

  // Export all chat messages relevant for a user.
  async export(id: BiomesId): Promise<Delivery[]> {
    const recorder = new ClientRequestStatRecorder("/chat/export");
    try {
      const key = chatsKey(id);
      const raw = await this.redis.replica.hgetallBuffer(key);
      const deliveries = compactMap(values(raw), (packed) =>
        deserializeSingleDelivery(packed)
      );
      this.compaction.maybeCompact(id);
      return compactDeliveries(deliveries);
    } catch (error) {
      recorder.error(grpc.status.INTERNAL);
      throw error;
    } finally {
      recorder.end();
    }
  }

  // Subscribe to all chat messages relevant for a user.
  async *subscribe(
    id: BiomesId,
    inputSignal?: AbortSignal
  ): AsyncIterable<Delivery> {
    const signal = this.controller.chain(inputSignal).signal;
    // The Redis client once subscribed is in 'subscribe' mode and cannot be used for
    // other purposes.
    const sub = this.redis.createSubscriptionConnection();
    const key = chatsKey(id);
    while (!signal?.aborted) {
      try {
        const [cb, stream] = callbackToStream<Delivery>(signal);
        sub.on("messageBuffer", (_channel, message) => {
          try {
            cb(deserializeSingleDelivery(message));
          } catch (error) {
            log.error("Error passing streamed chat message, ignoring.", {
              error,
            });
          }
        });
        sub.on("error", (error) => cb(undefined, error));

        await sub.subscribe(key);

        yield* await this.export(id);
        yield* stream;
      } catch (error) {
        log.error("Error while subscribed to chat", { id, error });
        await sleep(CONFIG.chatRedisSubscribeBackoffMs, signal);
      }
    }
    sub.disconnect("Chat subscription ended");
  }
}
