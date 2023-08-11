import type { ServiceDiscoveryApi } from "@/server/shared/discovery/api";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { BackgroundTaskController } from "@/shared/abort";
import { sleep } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { DefaultMap } from "@/shared/util/collections";
import { callbackToStream } from "@/shared/zrpc/callback_to_stream";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import EventEmitter from "events";
import type { ZodType } from "zod";
import { z } from "zod";

export const zScopedRequest = z.object({
  service: z.string(),
  nonce: z.string(),
});

export const zPublishRequest = zScopedRequest.extend({
  value: z.string(),
});

export const zServiceDiscoveryService = zservice("service-discovery")
  .addRpc(
    "getKnownServices",
    z.void(),
    z.set(z.string()) as ZodType<ReadonlySet<string>>
  )
  .addRpc("publish", zPublishRequest, z.void())
  .addRpc("unpublish", zScopedRequest, z.void())
  .addRpc(
    "discover",
    zScopedRequest,
    z.set(z.string()) as ZodType<ReadonlySet<string>>
  )
  .addStreamingRpc(
    "change",
    zScopedRequest,
    z.set(z.string()) as ZodType<ReadonlySet<string>>
  );

export type ServiceDiscoveryService = ZService<typeof zServiceDiscoveryService>;
export type ServiceDiscoveryClient = ZClient<typeof zServiceDiscoveryService>;

export class ServiceDiscoveryServiceImpl implements ServiceDiscoveryService {
  private readonly backing: DefaultMap<
    [service: string, nonce: string],
    ServiceDiscoveryApi
  >;

  constructor(backingFactory: (service: string) => ServiceDiscoveryApi) {
    this.backing = new DefaultMap(([service]) => backingFactory(service));
  }

  async getKnownServices() {
    return this.backing.get(["", ""]).getKnownServices();
  }

  async publish(
    _ctx: RpcContext,
    { service, nonce, value }: z.infer<typeof zPublishRequest>
  ) {
    await this.backing.get([service, nonce]).publish(value);
  }

  async unpublish(
    _ctx: RpcContext,
    { service, nonce }: z.infer<typeof zScopedRequest>
  ) {
    await this.backing.get([service, nonce]).publish(service);
  }

  async discover(
    _ctx: RpcContext,
    { service, nonce }: z.infer<typeof zScopedRequest>
  ) {
    return this.backing.get([service, nonce]).discover();
  }

  async *change(
    ctx: RpcContext,
    { service, nonce }: z.infer<typeof zScopedRequest>
  ) {
    const discovery = this.backing.get([service, nonce]);
    const [cb, stream] = callbackToStream<ReadonlySet<string>>(ctx.signal);

    discovery.on("change", cb);
    try {
      for await (const values of stream) {
        yield values;
      }
    } finally {
      discovery.off("change", cb);
    }
  }
}

export class RemoteServiceDiscovery implements ServiceDiscoveryApi {
  private readonly controller = new BackgroundTaskController();
  private readonly emitter = new EventEmitter();
  private readonly nonce = autoId();
  private startedWatch = false;

  constructor(
    private readonly client: ServiceDiscoveryClient,
    public readonly service: string
  ) {}

  private get scopedRequest(): z.infer<typeof zScopedRequest> {
    return {
      service: this.service,
      nonce: this.nonce,
    };
  }

  async getKnownServices() {
    return this.client.getKnownServices();
  }

  async publish(value: string) {
    await this.client.publish({
      ...this.scopedRequest,
      value,
    });
  }

  async unpublish() {
    await this.client.unpublish(this.scopedRequest);
  }

  async stop() {
    await this.unpublish();
    await this.controller.abortAndWait();
  }

  async discover() {
    return this.client.discover(this.scopedRequest);
  }

  private maybeStartWatch() {
    if (!this.startedWatch) {
      this.startedWatch = true;
      this.controller.runInBackground("watch", async (signal) => {
        do {
          for await (const values of this.client.change(
            this.scopedRequest,
            signal
          )) {
            this.emitter.emit("change", values);
          }
        } while (await sleep(250, signal));
      });
    }
  }

  on(event: "change", callback: (values: Set<string>) => void) {
    this.maybeStartWatch();
    this.emitter.on(event, callback);
  }

  off(event: "change", callback: (values: Set<string>) => void) {
    this.emitter.off(event, callback);
  }
}
