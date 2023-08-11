import { HostPort } from "@/server/shared/ports";
import type { PubSubTopic } from "@/server/shared/pubsub/api";
import { AbstractPubSub } from "@/server/shared/pubsub/api";
import { makeClient } from "@/server/shared/zrpc/client";
import { addRetriesForUnavailable } from "@/server/shared/zrpc/retries";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { BackgroundTaskController, chain } from "@/shared/abort";
import { log } from "@/shared/logging";
import { sleep } from "@/shared/util/async";
import { callbackToStream } from "@/shared/zrpc/callback_to_stream";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import EventEmitter from "events";
import { z } from "zod";

export const zPublishRequest = z.object({
  topic: z.string(),
  value: z.any(),
});

export type PublishRequest = z.infer<typeof zPublishRequest>;

export const zShimPubSubService = zservice("shim-pubsub")
  .addRpc("publish", zPublishRequest, z.void())
  .addStreamingRpc("subscribe", z.string(), z.any());

export type ShimPubSubClient = ZClient<typeof zShimPubSubService>;

export class ShimPubSubService implements ZService<typeof zShimPubSubService> {
  private readonly controller = new BackgroundTaskController();
  private readonly emitter = new EventEmitter();

  async stop() {
    await this.controller.abortAndWait();
  }

  async publish(
    _context: RpcContext,
    { topic, value }: PublishRequest
  ): Promise<void> {
    this.emitter.emit(topic, value);
  }

  async *subscribe(context: RpcContext, topic: string): AsyncGenerator<string> {
    const [cb, stream] = callbackToStream<any>(
      chain(this.controller, context.signal).signal
    );
    this.emitter.on(topic, cb);
    try {
      for await (const value of stream) {
        yield value;
      }
    } finally {
      this.emitter.off(topic, cb);
    }
  }
}

export class ShimPubsub<T extends PubSubTopic> extends AbstractPubSub<T> {
  constructor(private readonly client: ShimPubSubClient, topic: T) {
    super(topic);
  }

  protected async watch(signal: AbortSignal, observe: (value: any) => void) {
    do {
      try {
        for await (const value of this.client.subscribe(this.topic, signal)) {
          observe(value);
        }
      } catch (error) {
        log.warn("Error in shim pubsub", { error });
      }
    } while (await sleep(1000, signal));
  }

  async stop() {
    await super.stop();
    await this.client.close();
  }

  async publish(value: T) {
    await this.client.publish({ topic: this.topic, value });
  }
}

export function createShimPubSubClient() {
  return addRetriesForUnavailable(
    zShimPubSubService,
    makeClient(zShimPubSubService, HostPort.forShim().rpc)
  );
}
