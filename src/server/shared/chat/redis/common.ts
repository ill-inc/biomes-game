import {
  zChannelName,
  zEnvelope,
  zUnsendEnvelope,
  type Delivery,
} from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { zrpcDeserialize } from "@/shared/zrpc/serde";
import { z } from "zod";

// - Publish/Subscribe channel for updates
// - Key for storage of all chats.
export function chatsKey(id: BiomesId): string {
  return `chats:${id}`;
}

export const EXTENDED_DELIVERY_STREAM_KEY = Buffer.from("chat-delivery");
export const EXTENDED_DELIVERY_FIELD_NAME = Buffer.from("d");

// Like a delivery, but to support the parsing of legacy messages that may
// no longer be understood - without rejecting the whole batch.
const zLegacyDelivery = z.object({
  channelName: zChannelName,
  mail: z.array(z.any()).optional(),
  unsend: z.array(z.any()).optional(),
});

export function deserializeSingleDelivery(
  packed: Buffer
): Delivery | undefined {
  try {
    const raw = zrpcDeserialize(packed, zLegacyDelivery);
    const output: Delivery = { channelName: raw.channelName };
    if (raw.mail) {
      output.mail = [];
      for (const mail of raw.mail) {
        try {
          output.mail.push(zEnvelope.parse(mail));
        } catch (error) {
          log.warn("Ignoring malformed mail.", { error });
        }
      }
    }
    if (raw.unsend) {
      output.unsend = [];
      for (const unsend of raw.unsend) {
        try {
          output.unsend.push(zUnsendEnvelope.parse(unsend));
        } catch (error) {
          log.warn("Ignoring malformed unsend.", { error });
        }
      }
    }
    return output;
  } catch (error) {
    log.error("Error parsing chat message, ignoring.", { error });
  }
}

export function deserializeRedisDeliveries(fields: Buffer[]) {
  const deliveries: Delivery[] = [];
  for (let i = 0; i < fields.length; i += 2) {
    if (!fields[i].equals(EXTENDED_DELIVERY_FIELD_NAME)) {
      continue;
    }
    const delivery = deserializeSingleDelivery(fields[i + 1]);
    if (delivery) {
      deliveries.push(delivery);
    }
  }
  return deliveries;
}
