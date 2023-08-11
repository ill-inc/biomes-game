import type { ChatIo, ClientChannelSink } from "@/client/game/chat/io";
import {
  envelopeForChatError,
  envelopeForLocalMessage,
} from "@/client/game/chat/util";
import type { ClientContext } from "@/client/game/context";
import type { ClientResources } from "@/client/game/resources/types";
import { ChatChannel } from "@/shared/chat/chat_channel";
import type {
  ChatMessage,
  WatermarkMessageKinds,
} from "@/shared/chat/messages";
import type { Delivery } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";

export class NotificationsManager implements ClientChannelSink {
  private readonly channel = new ChatChannel();
  private optimisticWatermark = new Set<ChatMessage["kind"]>();

  constructor(
    private readonly chatIo: ChatIo,
    private readonly resources: ClientResources
  ) {
    chatIo.channel("activity").setSink(this);
  }

  get activity() {
    return this.channel.mail;
  }

  hotHandoff(old: NotificationsManager) {
    this.optimisticWatermark = old.optimisticWatermark;
  }

  past(kind: ChatMessage["kind"], ignoring?: Array<ChatMessage["kind"]>) {
    return this.optimisticWatermark.has(kind)
      ? []
      : this.channel.past(kind, ignoring);
  }

  getWatermark(kind: ChatMessage["kind"]) {
    return this.optimisticWatermark.has(kind)
      ? Infinity
      : this.channel.getWatermark(kind);
  }

  showChatError(error: any) {
    this.channel.accept([envelopeForChatError(error)]);
    this.invalidateResources();
  }

  showLocalMessage(message: ChatMessage, senderId?: BiomesId, nonce?: string) {
    if (nonce && this.channel.mail.find((e) => e.id === nonce)) {
      return;
    }

    this.channel.accept([envelopeForLocalMessage(message, senderId, nonce)]);
    this.invalidateResources();
  }

  delete(id: string) {
    this.channel.delete(id);
    this.invalidateResources();
  }

  accept(delivery: Delivery) {
    if (delivery.mail) {
      this.channel.accept(delivery.mail);
    }
    if (delivery.unsend) {
      this.channel.unaccept(delivery.unsend);
    }
    this.channel.gc();
    this.optimisticWatermark.clear();
    this.invalidateResources();
  }

  async markAs(...kinds: WatermarkMessageKinds[]) {
    for (const kind of kinds) {
      this.optimisticWatermark.add(kind);
    }
    this.invalidateResources();
    await this.chatIo.mark("activity", this.channel.maxCreatedAt + 1, ...kinds);
    this.invalidateResources();
  }

  private invalidateResources() {
    this.resources.update(
      "/activity",
      (activity) => (activity.messages = this.activity)
    );
    this.resources.update(
      "/activity/unread",
      (unread) => (unread.messages = this.past("read", ["popped", "read"]))
    );
    this.resources.update(
      "/activity/popup",
      (popup) => (popup.messages = this.past("popped", ["popped", "read"]))
    );
  }
}

export async function loadNotificationsManager(
  loader: RegistryLoader<ClientContext>
): Promise<NotificationsManager> {
  const [resources, chatIo] = await Promise.all([
    loader.get("resources"),
    loader.get("chatIo"),
  ]);
  return new NotificationsManager(chatIo, resources);
}
