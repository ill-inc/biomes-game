import { zSimulationName } from "@/server/gaia_v2/simulations/api";
import { BackgroundTaskController } from "@/shared/abort";
import { zShardId } from "@/shared/game/shard";
import { log } from "@/shared/logging";
import { isBinaryData, normalizeBinaryData } from "@/shared/util/binary";
import { zrpcDeserialize } from "@/shared/zrpc/serde";
import EventEmitter from "events";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

export type PubSubTopic = `gaia-hipri` | "test";

export const zGaiaPubSubUpdate = z.array(
  z.tuple([zSimulationName, z.array(zShardId)])
);

export type GaiaPubSubUpdate = z.infer<typeof zGaiaPubSubUpdate>;

export const PUBSUB_SCHEMA = {
  test: z.string(),
  "gaia-hipri": zGaiaPubSubUpdate,
} as const satisfies Record<PubSubTopic, ZodTypeAny>;

export type PubSubUpdateFor<T extends PubSubTopic> = z.infer<
  (typeof PUBSUB_SCHEMA)[T]
>;

export type ListenerFor<T extends PubSubTopic> = (
  value: PubSubUpdateFor<T>
) => void;

// Listens to a value, doesn't have any persistence at all.
export interface PubSub<T extends PubSubTopic> {
  stop(): Promise<void>;
  publish(value: PubSubUpdateFor<T>): Promise<void>;
  on(listener: (value: PubSubUpdateFor<T>) => void): void;
  off(listener: (value: PubSubUpdateFor<T>) => void): void;
}

export abstract class AbstractPubSub<T extends PubSubTopic>
  implements PubSub<T>
{
  private readonly emitter = new EventEmitter();
  protected readonly controller = new BackgroundTaskController();
  private started = false;

  constructor(public readonly topic: T) {}

  get schema() {
    return PUBSUB_SCHEMA[this.topic];
  }

  private parse(value: any): PubSubUpdateFor<T> | undefined {
    try {
      if (isBinaryData(value)) {
        return zrpcDeserialize(normalizeBinaryData(value), this.schema);
      } else {
        return this.schema.parse(value);
      }
    } catch (error) {
      log.error("Failed to parse pubsub value", { error, value });
    }
  }

  async stop() {
    this.emitter.removeAllListeners();
    await this.controller.abortAndWait();
  }

  private start() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.controller.runInBackground(`watch`, (signal) =>
      this.watch(signal, (value) => {
        const parsed = this.parse(value);
        if (parsed !== undefined) {
          this.emitter.emit(this.topic, parsed);
        }
      })
    );
  }

  on(listener: ListenerFor<T>) {
    this.start();
    this.emitter.on(this.topic, listener);
  }

  off(listener: ListenerFor<T>) {
    this.emitter.off(this.topic, listener);
  }

  // Must be implemented by subclasses.
  protected abstract watch(
    signal: AbortSignal,
    observe: (value: any) => void
  ): Promise<void>;

  abstract publish(value: PubSubUpdateFor<T>): Promise<void>;
}
