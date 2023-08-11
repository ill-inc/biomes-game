import {
  chatsKey,
  deserializeSingleDelivery,
} from "@/server/shared/chat/redis/common";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import { BackgroundTaskController } from "@/shared/abort";
import type { ChatChannel } from "@/shared/chat/chat_channel";
import { ChannelSet } from "@/shared/chat/chat_channel";
import type { Delivery } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { Timer } from "@/shared/metrics/timer";
import { DefaultMap, compactMap } from "@/shared/util/collections";
import { ok } from "assert";

function compactChannel(
  channel: ChatChannel | undefined,
  {
    maxMessageAgeMs,
    maxMessageCount,
  }: {
    maxMessageAgeMs?: number;
    maxMessageCount?: number;
  }
) {
  if (!channel) {
    return;
  }
  channel.maxMessageAgeMs = maxMessageAgeMs;
  channel.maxMessageCount = maxMessageCount;
  channel.gc();
}

// Reduce the potentially multiple deliveries stored for a channel into a single delivery.
export function compactDeliveries(deliveries: Delivery[]): Delivery[] {
  // Group all the mail.
  const mail = new ChannelSet();
  mail.accept(...deliveries);

  // Compact the mail.
  compactChannel(mail.peek("chat"), { maxMessageAgeMs: 24 * 60 * 60 * 1000 });
  compactChannel(mail.peek("dm"), { maxMessageCount: 1000 });
  compactChannel(mail.peek("activity"), { maxMessageCount: 1000 });
  return mail.asDeliveries();
}

export function allUsedIds(deliveries: Delivery[]): Set<string> {
  const ids = new Set<string>();
  for (const delivery of deliveries) {
    ok(!delivery.unsend);
    if (!delivery.mail) {
      continue;
    }
    for (const { id } of delivery.mail) {
      ids.add(id);
    }
  }
  return ids;
}

// Compact all chat channels for a user.
// We do this by reading all the deliveries and recording every ID, and then
// compacting them in a smaller set - and determining the IDs that are still used.
export async function compactChats(redis: BiomesRedisConnection, id: BiomesId) {
  const key = chatsKey(id);

  const raw = await redis.hgetallBuffer(key);
  const seenIds = new Set<string>();
  const deliveries = compactMap(Object.entries(raw), ([id, packed]) => {
    seenIds.add(id);
    return deserializeSingleDelivery(packed);
  });

  const compacted = compactDeliveries(deliveries);
  const usedIds = allUsedIds(compacted);

  const tx = redis.multi();
  let deletedAnything = false;
  for (const id of seenIds) {
    if (usedIds.has(id)) {
      continue;
    }
    tx.hdel(key, id);
    deletedAnything = true;
  }
  if (deletedAnything) {
    await tx.exec();
  }
}

export class CompactionThrottle {
  private readonly controller = new BackgroundTaskController();
  private readonly lastCompaction = new DefaultMap<BiomesId, Timer>(
    () => new Timer()
  );

  constructor(private readonly redis: BiomesRedisConnection) {}

  maybeCompact(id: BiomesId) {
    const timer = this.lastCompaction.get(id);
    if (
      timer.elapsed <
      // We add a random time so not to align compaction for different users.
      CONFIG.chatCompactionFrequencyMs + Math.random() * 5000
    ) {
      return;
    }
    timer.reset();
    this.controller.runInBackground(`compact:${id}`, () =>
      compactChats(this.redis, id)
    );
  }

  async stop() {
    await this.controller.abortAndWait();
  }
}
