import type { GardenHose } from "@/client/events/api";
import {
  envelopeForChatError,
  envelopeForChatInfo,
} from "@/client/game/chat/util";
import type { ClientContext } from "@/client/game/context";
import type { ClientResources } from "@/client/game/resources/types";
import type { InitialState } from "@/shared/api/sync";
import { ChatChannel } from "@/shared/chat/chat_channel";
import type { Delivery, Envelope } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";

export class MailMan {
  static RECENT_MESSAGE_PURGE_THRESHOLD_MS = 30 * 1000;

  private readonly chatChannel: ChatChannel;
  private readonly dmChannel: ChatChannel;
  private gcHandle?: ReturnType<typeof setTimeout>;
  recentTexts = new Map<BiomesId, Envelope>();
  bootstrapComplete = false;

  constructor(
    private readonly userId: BiomesId,
    private readonly resources: ClientResources,
    initialState: InitialState,
    private readonly gardenHose: GardenHose
  ) {
    this.chatChannel = new ChatChannel(24 * 60 * 60 * 1000);
    this.dmChannel = new ChatChannel();
    for (const delivery of initialState.deliveries) {
      this.accept(delivery);
    }
  }

  finishBootstrap() {
    this.bootstrapComplete = true;
  }

  get mail() {
    return this.chatChannel.mail;
  }

  get dms() {
    return this.dmChannel.mail;
  }

  delete(id: string) {
    this.chatChannel.delete(id);
    this.invalidateResources();
  }

  accept(delivery: Delivery) {
    // TODO: Support unsending chats?
    let { mail } = delivery;
    if (!mail) {
      return;
    }

    mail = mail.filter(
      (e) => e.message.kind !== "typing" || e.from !== this.userId
    );
    this.chatChannel.accept(mail);
    if (delivery.channelName === "dm") {
      this.dmChannel.accept(mail);
    }
    this.populateRecentMessages(mail);
    this.invalidateResources();
    this.gardenHose.publish({
      kind: "mail_received",
      mail,
      initialBootstrap: !this.bootstrapComplete,
    });

    if (this.gcHandle) {
      clearTimeout(this.gcHandle);
    }
    this.gcHandle = setTimeout(() => {
      this.chatChannel.gc();
      this.invalidateResources();
    }, ChatChannel.TYPING_EXPIRY_MS + 1);
  }

  private populateRecentMessages(mail: Envelope[]) {
    for (const envelope of mail) {
      if (envelope.from && envelope.message.kind === "text") {
        this.recentTexts.set(envelope.from, envelope);
      }
    }

    // GC
    for (const [k, v] of this.recentTexts) {
      if (
        Date.now() - v.createdAt >
        MailMan.RECENT_MESSAGE_PURGE_THRESHOLD_MS
      ) {
        this.recentTexts.delete(k);
      }
    }
  }

  showChatError(error: any, senderId?: BiomesId) {
    this.chatChannel.accept([envelopeForChatError(error, senderId)]);
    this.invalidateResources();
  }

  showChatInfo(info: string, senderId?: BiomesId) {
    this.chatChannel.accept([envelopeForChatInfo(info, senderId)]);
    this.invalidateResources();
  }

  isCurrentlyTyping(playerId: BiomesId) {
    return !!this.chatChannel.currentlyTyping.get(playerId);
  }

  getLastDmAuthor(): BiomesId | undefined {
    let author: BiomesId | undefined;
    for (const dm of this.dms) {
      if (dm.from && dm.from !== this.userId) {
        author = dm.from;
      }
    }
    return author;
  }

  private invalidateResources() {
    this.resources.update("/chat", (chat) => (chat.messages = this.mail));
    this.resources.update("/dms", (chat) => (chat.messages = this.dms));
  }
}

export async function registerMailman(
  loader: RegistryLoader<ClientContext>
): Promise<MailMan> {
  const [userId, resources, chatIo, initialState, gardenHose] =
    await Promise.all([
      loader.get("userId"),
      loader.get("resources"),
      loader.get("chatIo"),
      loader.get("initialState"),
      loader.get("gardenHose"),
    ]);
  const sink = new MailMan(userId, resources, initialState, gardenHose);
  initialState.deliveries.length = 0;
  chatIo.channel("chat").setSink(sink);
  chatIo.channel("dm").setSink(sink);
  sink.finishBootstrap();
  return sink;
}
