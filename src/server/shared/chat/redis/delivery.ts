import { chatsKey } from "@/server/shared/chat/redis/common";
import type { Envelope, UnsendEnvelope } from "@/shared/chat/types";
import { type ChannelName, type Delivery } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { autoId } from "@/shared/util/auto_id";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import type { ChainableCommander } from "ioredis";

export type DeliveryMode = "mail" | "unsend";
export type EnvelopeForMode<TMode> = TMode extends "mail"
  ? Envelope
  : UnsendEnvelope & { id?: undefined };

// Represents a delivery that can be send to Redis.
export class PreparedDelivery<TMode extends DeliveryMode> {
  public readonly delivery: Delivery;
  #packedDelivery?: Buffer;

  constructor(
    public readonly channelName: ChannelName,
    public readonly envelope: EnvelopeForMode<TMode>,
    public readonly mode: TMode
  ) {
    this.delivery = {
      channelName,
      [mode]: [envelope],
    };
  }

  get packedDelivery(): Buffer {
    if (!this.#packedDelivery) {
      this.#packedDelivery = zrpcSerialize(this.delivery);
    }
    return this.#packedDelivery;
  }

  deliver(tx: ChainableCommander, to: BiomesId) {
    // Unsends get a made-up ID, garbage collection will clean it up.
    const id = this.envelope.id ?? autoId();
    const key = chatsKey(to);
    tx.hset(key, id, this.packedDelivery);
    tx.publish(key, this.packedDelivery);
  }
}

export type AnyPreparedDelivery = PreparedDelivery<DeliveryMode>;
