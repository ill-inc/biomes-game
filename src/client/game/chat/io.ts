import type { EarlyClientContext } from "@/client/game/context";
import type { MarkRequest } from "@/pages/api/chat/mark";
import type {
  SendMessageRequest,
  SendMessageResponse,
} from "@/pages/api/chat/message";
import { ChannelSet } from "@/shared/chat/chat_channel";
import type {
  ChatMessage,
  WatermarkMessageKinds,
} from "@/shared/chat/messages";
import type {
  ChannelName,
  Delivery,
  Envelope,
  MessageVolume,
} from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { v4 as uuid } from "uuid";

export interface ClientChannelSink {
  showChatError(error: any): void;
  accept(delivery: Delivery): void;
  delete(id: string): void;
}

export class ClientChannel {
  private buffer = new ChannelSet();
  private sink?: ClientChannelSink;

  delete(id: string) {
    if (this.sink) {
      this.sink.delete(id);
    } else {
      this.buffer.delete(id);
    }
  }

  showChatError(error: any) {
    if (this.sink) {
      this.sink.showChatError(error);
    }
  }

  accept(delivery: Delivery) {
    if (this.sink) {
      this.sink.accept(delivery);
    } else {
      this.buffer.accept(delivery);
    }
  }

  setSink(sink: ClientChannelSink) {
    this.sink = sink;
    for (const delivery of this.buffer.pop()) {
      sink.accept(delivery);
    }
  }
}

export class ChatIo {
  private channels: {
    dm: ClientChannel;
    chat: ClientChannel;
    activity: ClientChannel;
  };
  private outstandingChat = Promise.resolve();

  constructor(private readonly userId: BiomesId) {
    const common = new ClientChannel();
    this.channels = {
      dm: common,
      chat: common,
      activity: new ClientChannel(),
    };
  }

  channel(channel: ChannelName): ClientChannel {
    return this.channels[channel];
  }

  accept(delivery: Delivery) {
    const cc = this.channel(delivery.channelName);
    if (cc !== undefined) {
      cc.accept(delivery);
    }
  }

  async mark(
    channel: ChannelName,
    timestamp: number,
    ...kinds: WatermarkMessageKinds[]
  ) {
    await jsonPost<void, MarkRequest>("/api/chat/mark", {
      kinds,
      channel,
      timestamp,
    });
  }

  async sendMessage(
    volume: MessageVolume,
    message: ChatMessage,
    to?: BiomesId
  ): Promise<void> {
    // Optimistically perform the delivery, and update it
    // based upon the server response.
    const localId = uuid();
    const localEnvelope: Envelope = {
      id: localId,
      createdAt: Date.now(),
      localTime: Date.now(),
      from: this.userId,
      spatial: {
        volume,
      },
      message,
      to,
    };
    const cc = this.channel("chat");
    if (!cc) {
      return;
    }
    cc.accept({ channelName: "chat", mail: [localEnvelope] });
    this.outstandingChat = this.outstandingChat.then(async () => {
      try {
        const result = await jsonPost<SendMessageResponse, SendMessageRequest>(
          "/api/chat/message",
          {
            localTime: localEnvelope.localTime!,
            volume,
            message,
            to,
          }
        );
        if (result.delivery) {
          this.accept(result.delivery);
        }
      } catch (error) {
        cc.showChatError(error);
      } finally {
        cc.delete(localId);
      }
    });
    return this.outstandingChat;
  }
}

export async function registerChatIo(
  loader: RegistryLoader<EarlyClientContext>
): Promise<ChatIo> {
  return new ChatIo(await loader.get("userId"));
}
