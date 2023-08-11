import type {
  ChatApi,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
} from "@/server/shared/chat/api";
import type { PlayerSpatialObserver } from "@/server/shared/chat/player_observer";
import {
  determineChannel,
  determineTargets,
  wrapInEnvelope,
} from "@/server/shared/chat/util";
import { ChannelSet } from "@/shared/chat/chat_channel";
import type { Delivery } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { DefaultMap, MultiMap } from "@/shared/util/collections";
import { callbackToStream } from "@/shared/zrpc/callback_to_stream";

export class InMemoryChatApi implements ChatApi {
  private readonly storage = new DefaultMap<BiomesId, ChannelSet>(
    () => new ChannelSet()
  );
  private readonly subscriptions = new MultiMap<
    BiomesId,
    (message: Delivery) => void
  >();

  constructor(private readonly players: PlayerSpatialObserver) {}

  async healthy(): Promise<boolean> {
    return true;
  }

  private deliver(target: BiomesId, delivery: Delivery) {
    this.storage.get(target).accept(delivery);
    for (const subscription of this.subscriptions.get(target)) {
      subscription(delivery);
    }
  }

  deliverAllForTest(deliveries: Delivery[]) {
    for (const delivery of deliveries) {
      if (!delivery.mail) {
        continue;
      }
      // Group by target
      const deliveryByTarget = new DefaultMap<BiomesId, Delivery>(
        () =>
          <Delivery>{
            channelName: delivery.channelName,
            mail: [],
          }
      );
      for (const envelope of delivery.mail) {
        const recipients = determineTargets(
          this.players,
          delivery.channelName,
          envelope
        );
        for (const recipient of recipients) {
          deliveryByTarget.get(recipient).mail!.push(envelope);
        }
      }
      for (const [target, delivery] of deliveryByTarget) {
        this.deliver(target, delivery);
      }
    }
  }

  // Send a message to the chat system.
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const envelope = await wrapInEnvelope(request, this.players);
    const channelName = determineChannel(request);
    const delivery: Delivery = { channelName, mail: [envelope] };

    const recipients = determineTargets(this.players, channelName, envelope);
    for (const recipient of recipients) {
      this.deliver(recipient, delivery);
    }

    const { from } = request;
    const noteToSelf = from && recipients.has(from);
    return {
      id: envelope.id,
      echo: noteToSelf ? delivery : undefined,
    };
  }

  // Unsend a message from the chat system.
  async unsendMessage(request: UnsendMessageRequest): Promise<void> {
    const envelope = await wrapInEnvelope(request, this.players);
    const channelName = determineChannel(request);
    const delivery: Delivery = { channelName, unsend: [envelope] };

    const recipients = determineTargets(this.players, channelName, envelope);
    for (const recipient of recipients) {
      this.deliver(recipient, delivery);
    }
  }

  // Delete a particular subject from the chat system, across all messages.
  // Will be performed in the background, you cannot wait for it.
  deleteEntity(_id: BiomesId): void {
    // TODO: Implement.
  }

  // Export all chat messages relevant for a user.
  async export(id: BiomesId): Promise<Delivery[]> {
    return this.storage.get(id).asDeliveries();
  }

  // Subscribe to all chat messages relevant for a user.
  async *subscribe(
    id: BiomesId,
    signal?: AbortSignal
  ): AsyncIterable<Delivery> {
    const [cb, stream] = callbackToStream<Delivery>(signal);
    this.subscriptions.add(id, cb);
    try {
      yield* await this.export(id);
      yield* stream;
    } finally {
      this.subscriptions.delete(id, cb);
    }
  }
}
