import type { ChatMessage } from "@/shared/chat/messages";
import { WATERMARK_MESSAGE_KINDS } from "@/shared/chat/messages";
import type {
  ChannelName,
  Delivery,
  Envelope,
  UnsendEnvelope,
} from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import {
  DefaultMap,
  compactMap,
  filterMapInPlace,
  reduceMap,
} from "@/shared/util/collections";
import { isEqual, remove } from "lodash";

export type OptExpiry<T> = T & { expiresAtMs?: number };

function threholdForWatermark(envelope: Envelope) {
  return envelope.localTime ?? envelope.createdAt;
}

export class ChatChannel {
  static TYPING_EXPIRY_MS = 2000;
  static NEW_SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes.

  readonly newSessionMarkers = new Map<BiomesId, string>(); // Sender to message ID.
  readonly currentlyTyping = new Map<BiomesId, string>(); // Sender to typing letter.
  readonly #mail = new Map<string, OptExpiry<Envelope>>();
  #sorted?: Envelope[];
  readonly #watermarkByKind = new Map<ChatMessage["kind"], number>();

  constructor(
    public maxMessageAgeMs?: number,
    public maxMessageCount?: number
  ) {}

  get maxCreatedAt(): number {
    return reduceMap(0, this.#mail, (acc, m) => Math.max(acc, m.createdAt));
  }

  getWatermark(kind: ChatMessage["kind"]) {
    let watermark = this.#watermarkByKind.get(kind);
    if (watermark === undefined) {
      watermark = this.mail.reduce(
        (acc, m) =>
          m.message.kind === kind
            ? Math.max(acc, threholdForWatermark(m))
            : acc,
        0
      );
      this.#watermarkByKind.set(kind, watermark);
    }
    return watermark;
  }

  past(
    kind: ChatMessage["kind"],
    ignoring?: Array<ChatMessage["kind"]>
  ): Envelope[] {
    return this.mail.filter(
      (m) =>
        m.message.kind !== kind &&
        m.createdAt > this.getWatermark(kind) &&
        !ignoring?.includes(m.message.kind)
    );
  }

  get mail(): Envelope[] {
    if (this.#sorted === undefined) {
      this.#sorted = Array.from(this.#mail.values());
      this.#sorted.sort((a, b) => a.createdAt - b.createdAt);
    }
    return this.#sorted;
  }

  gc() {
    // First, expire any mail by age.
    filterMapInPlace(this.#mail, (m) => {
      if (m.expiresAtMs !== undefined && m.expiresAtMs < Date.now()) {
        return false;
      }
      return m.createdAt + (this.maxMessageAgeMs ?? Infinity) > Date.now();
    });

    // Mark for re-sorting, clear cache of watermark times.
    this.#sorted = undefined;
    this.#watermarkByKind.clear();

    // Remove any by count limits.
    if (this.maxMessageCount && this.#mail.size > this.maxMessageCount) {
      const toDelete = this.mail.slice(
        0,
        this.#mail.size - this.maxMessageCount
      );
      for (const mail of toDelete) {
        this.#mail.delete(mail.id);
      }
    }

    // Then, cleanup any markers that no longer exist.
    filterMapInPlace(this.currentlyTyping, (id) => this.#mail.has(id));
    filterMapInPlace(this.newSessionMarkers, (id) => this.#mail.has(id));
  }

  delete(id: string) {
    const existing = this.#mail.get(id);
    if (this.#sorted !== undefined && existing !== undefined) {
      remove(this.#sorted, (value) => value == existing);
      this.#mail.delete(id);
    }
  }

  unaccept(mail: UnsendEnvelope[]) {
    for (const delM of mail) {
      if (delM === undefined) {
        return;
      }
      for (const [id, mail] of this.#mail) {
        if (delM.from && mail.from !== delM.from) {
          continue;
        }
        if (delM.to && mail.to !== delM.to) {
          continue;
        }
        if (delM.message && !isEqual(mail.message, delM.message)) {
          continue;
        }
        this.#mail.delete(id);
      }
    }
    this.gc();
  }

  accept(mail: OptExpiry<Envelope>[]) {
    for (const newM of mail) {
      if (newM === undefined || this.#mail.has(newM.id)) {
        continue;
      }
      if (WATERMARK_MESSAGE_KINDS.has(newM.message.kind)) {
        let existing: Envelope | undefined;
        for (const m of this.#mail.values()) {
          if (m.message.kind === newM.message.kind) {
            existing = m;
            break;
          }
        }
        if (existing) {
          if (threholdForWatermark(existing) < threholdForWatermark(newM)) {
            this.#mail.delete(existing.id);
            this.#mail.set(newM.id, newM);
          }
        } else {
          this.#mail.set(newM.id, newM);
        }
        continue;
      }
      switch (newM.message.kind) {
        case "typing":
          {
            if (!newM.from) {
              continue;
            }
            newM.expiresAtMs = Date.now() + ChatChannel.TYPING_EXPIRY_MS;
            const currentTypingNote = this.currentlyTyping.get(newM.from);
            if (currentTypingNote) {
              this.#mail.delete(currentTypingNote);
            }
            this.currentlyTyping.set(newM.from, newM.id);
          }
          break;
        case "new_session":
          {
            if (!newM.from) {
              continue;
            }
            newM.expiresAtMs = Date.now() + ChatChannel.NEW_SESSION_EXPIRY_MS;
            const currentNewSessionNote = this.newSessionMarkers.get(newM.from);
            if (currentNewSessionNote) {
              this.#mail.delete(currentNewSessionNote);
            }
            this.newSessionMarkers.set(newM.from, newM.id);
          }
          break;
        default:
          {
            if (newM.from) {
              const typingNote = this.currentlyTyping.get(newM.from);
              if (typingNote) {
                // They are no longer typing, delete the notice.
                this.currentlyTyping.delete(newM.from);
                this.#mail.delete(typingNote);
              }
            }
          }
          break;
      }
      if (newM.from) {
        const optimisticDeletes = compactMap(this.#mail.values(), (m) => {
          if (
            m.from === newM.from &&
            m.localTime === newM.localTime &&
            m.message.kind === newM.message.kind
          ) {
            return m.id;
          }
        });
        for (const id of optimisticDeletes) {
          this.#mail.delete(id);
        }
      }
      this.#mail.set(newM.id, newM);
    }
    this.gc();
  }
}

// Useful for batching updates to a series of channels (similar in purpose to a
// TickChangeBuffer for ECS).
export class ChannelSet {
  private readonly channels = new DefaultMap<ChannelName, ChatChannel>(
    () => new ChatChannel()
  );

  get(channelName: ChannelName) {
    return this.channels.get(channelName);
  }

  peek(channelName: ChannelName) {
    return this.channels.peek(channelName);
  }

  delete(id: string) {
    for (const channel of this.channels.values()) {
      channel.delete(id);
    }
  }

  accept(...deliveries: Delivery[]) {
    const mailByChannel = new DefaultMap<ChannelName, Envelope[]>(() => []);
    const unsendByChannel = new DefaultMap<ChannelName, UnsendEnvelope[]>(
      () => []
    );
    for (const delivery of deliveries) {
      if (delivery.mail) {
        mailByChannel.get(delivery.channelName).push(...delivery.mail);
      }
      if (delivery.unsend) {
        unsendByChannel.get(delivery.channelName).push(...delivery.unsend);
      }
    }
    for (const [channelName, mail] of mailByChannel) {
      this.channels.get(channelName).accept(mail);
    }
    for (const [channelName, unsend] of unsendByChannel) {
      this.channels.get(channelName).unaccept(unsend);
    }
  }

  asDelivery(channelName: ChannelName): Delivery {
    return { channelName, mail: this.channels.get(channelName).mail };
  }

  asDeliveries(): Delivery[] {
    const deliveries: Delivery[] = [];
    for (const channelName of this.channels.keys()) {
      deliveries.push(this.asDelivery(channelName));
    }
    return deliveries;
  }

  clear() {
    this.channels.clear();
  }

  pop(): Delivery[] {
    const result = this.asDeliveries();
    this.clear();
    return result;
  }

  get empty() {
    return this.channels.size === 0;
  }
}
