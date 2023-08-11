import { zChatMessage } from "@/shared/chat/messages";
import type { Delivery } from "@/shared/chat/types";
import { zChannelName, zDelivery, zSpatial } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zSendMessageRequest = z.object({
  // Optional ID for idempotency, do not use from the client!
  // Should be globally unique, e.g. autoId()
  id: z.string().optional(),
  localTime: z.number().optional(),
  from: zBiomesId.optional(),
  spatial: zSpatial.optional(),
  message: zChatMessage,
  to: zBiomesId.optional(),
  channel: zChannelName.optional(),
});
export type SendMessageRequest = z.infer<typeof zSendMessageRequest>;

export const zSendMessageResponse = z.object({
  id: z.string(),
  echo: zDelivery.optional(),
});
export type SendMessageResponse = z.infer<typeof zSendMessageResponse>;

export const zUnsendMessageRequest = z.object({
  from: zBiomesId.optional(),
  message: zChatMessage,
  to: zBiomesId.optional(),
  channel: zChannelName.optional(),
});

export type UnsendMessageRequest = z.infer<typeof zUnsendMessageRequest>;

export interface ChatApi {
  healthy(): Promise<boolean>;

  // Send a message to the chat system.
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;

  // Unsend a message from the chat system.
  unsendMessage(request: UnsendMessageRequest): Promise<void>;

  // Delete a particular subject from the chat system, across all messages.
  // Will be performed in the background, you cannot wait for it.
  deleteEntity(id: BiomesId): void;

  // Export all chat messages relevant for a user.
  export(id: BiomesId): Promise<Delivery[]>;

  // Subscribe to all chat messages relevant for a user.
  subscribe(id: BiomesId, signal?: AbortSignal): AsyncIterable<Delivery>;
}
