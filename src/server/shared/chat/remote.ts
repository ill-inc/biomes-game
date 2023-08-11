import type {
  ChatApi,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
} from "@/server/shared/chat/api";
import {
  zSendMessageRequest,
  zSendMessageResponse,
  zUnsendMessageRequest,
} from "@/server/shared/chat/api";
import type { ZService } from "@/server/shared/zrpc/server_types";
import type { Delivery } from "@/shared/chat/types";
import { zDelivery } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

export const zDeleteEntityRequest = z.object({
  id: zBiomesId,
});

export type DeleteEntityRequest = z.infer<typeof zDeleteEntityRequest>;

export const zChatService = zservice("chat")
  .addRpc("healthy", z.void(), z.boolean())
  // Send a message to the chat system.
  .addRpc("sendMessage", zSendMessageRequest, zSendMessageResponse)
  // Unsend a message from the chat system.
  .addRpc("unsendMessage", zUnsendMessageRequest, z.void())
  // Delete a particular subject from the chat system, across all messages.
  .addRpc("deleteEntity", zDeleteEntityRequest, z.void())
  .addRpc("export", zBiomesId, zDelivery.array())
  // Subscribe to all chat messages relevant for a user.
  // Note: It is guaranteed to send at least one delivery immediately,
  // however that delivery may be empty (for new users).
  .addStreamingRpc("subscribe", zBiomesId, zDelivery);

export type ChatService = ZService<typeof zChatService>;

export class RemoteChatApi implements ChatApi {
  constructor(private readonly client: ZClient<typeof zChatService>) {}

  async healthy(): Promise<boolean> {
    try {
      await this.client.healthy();
      return true;
    } catch (error) {
      log.error("Error checking ChatApi health", { error });
      return false;
    }
  }

  // Send a message to the chat system.
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    return this.client.sendMessage(request);
  }

  // Unsend a message from the chat system.
  unsendMessage(request: UnsendMessageRequest): Promise<void> {
    return this.client.unsendMessage(request);
  }

  // Delete a particular subject from the chat system, across all messages.
  // Will be performed in the background, you cannot wait for it.
  deleteEntity(id: BiomesId): void {
    // TODO: Maybe make reliable?
    fireAndForget(this.client.deleteEntity({ id }));
  }

  // Export all chat messages relevant for a user.
  export(id: BiomesId): Promise<Delivery[]> {
    return this.client.export(id);
  }

  // Subscribe to all chat messages relevant for a user.
  async *subscribe(
    id: BiomesId,
    signal?: AbortSignal
  ): AsyncIterable<Delivery> {
    while (!signal?.aborted) {
      yield* this.client.subscribe(id, signal);
    }
  }
}

export class ExposeChatService implements ChatService {
  constructor(private readonly backing: ChatApi) {}

  async healthy() {
    return this.backing.healthy();
  }

  async sendMessage(_context: RpcContext, request: SendMessageRequest) {
    return this.backing.sendMessage(request);
  }

  async unsendMessage(_context: RpcContext, request: UnsendMessageRequest) {
    return this.backing.unsendMessage(request);
  }

  async deleteEntity(_context: RpcContext, { id }: DeleteEntityRequest) {
    return this.backing.deleteEntity(id);
  }

  async export(_context: RpcContext, id: BiomesId) {
    return this.backing.export(id);
  }

  subscribe({ signal }: RpcContext, id: BiomesId) {
    return this.backing.subscribe(id, signal);
  }
}
