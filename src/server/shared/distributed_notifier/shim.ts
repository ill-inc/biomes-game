import type {
  DistributedNotifierKey,
  Notifier,
  NotifierEvents,
} from "@/server/shared/distributed_notifier/api";
import { HostPort } from "@/server/shared/ports";
import { makeClient } from "@/server/shared/zrpc/client";
import { addRetriesForUnavailable } from "@/server/shared/zrpc/retries";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { BackgroundTaskController, waitForAbort } from "@/shared/abort";
import {
  ConditionVariable,
  safeSetImmediate,
  sleep,
} from "@/shared/util/async";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";
import { z } from "zod";

export const zNotifyRequest = z.object({
  key: z.string(),
  value: z.string(),
});

export type NotifyRequest = z.infer<typeof zNotifyRequest>;

export const zShimNotifierService = zservice("shim-notifier")
  .addRpc("notify", zNotifyRequest, z.void())
  .addRpc("fetch", z.string(), z.string().optional())
  .addStreamingRpc("listen", z.string(), z.string());

export type ShimNotifierClient = ZClient<typeof zShimNotifierService>;

export class ShimNotifierService
  implements ZService<typeof zShimNotifierService>
{
  private readonly controller = new BackgroundTaskController();
  private readonly cv = new ConditionVariable();
  private values = new Map<string, string>();

  set(key: string, value: string) {
    this.values.set(key, value);
    this.cv.signal();
  }

  async stop() {
    this.cv.signal();
    await this.controller.abortAndWait();
  }

  async notify(
    _context: RpcContext,
    { key, value }: NotifyRequest
  ): Promise<void> {
    this.set(key, value);
  }

  async fetch(_context: RpcContext, key: string): Promise<string | undefined> {
    return this.values.get(key);
  }

  async *listen(context: RpcContext, key: string): AsyncGenerator<string> {
    const controller = this.controller.chain(context.signal);
    let last: string | undefined;
    while (!controller.aborted) {
      const current = this.values.get(key);
      if (current !== undefined && current !== last) {
        last = current;
        yield current;
      }
      await Promise.race([this.cv.wait(), waitForAbort(controller.signal)]);
    }
  }
}

export class ShimNotifier<T extends string = string> implements Notifier<T> {
  private readonly emitter = new EventEmitter() as TypedEventEmitter<
    NotifierEvents<T>
  >;
  private readonly controller = new BackgroundTaskController();
  private startedWatch = false;
  private lastSeen: T | null = null;

  constructor(
    private readonly client: ShimNotifierClient,
    private readonly key: DistributedNotifierKey
  ) {}

  private start() {
    if (this.startedWatch) {
      return;
    }
    this.startedWatch = true;
    this.controller.runInBackground("poll", async (signal) => {
      do {
        try {
          for await (const value of this.client.listen(this.key, signal)) {
            if (value !== this.lastSeen && value !== null) {
              this.lastSeen = value as T;
              this.emitter.emit("change", this.lastSeen);
            }
          }
        } catch (e) {
          // Ignore any exceptions.
        }
      } while (await sleep(1000, signal));
    });
  }

  async stop() {
    this.emitter.removeAllListeners();
    await this.controller.abortAndWait();
  }

  async notify(value: T) {
    await this.client.notify({ key: this.key, value });
  }

  async fetch() {
    return (await this.client.fetch(this.key)) as T | undefined;
  }

  on(event: "change", listener: (value: T) => void) {
    this.start();
    if (this.lastSeen !== null) {
      safeSetImmediate(() => listener(this.lastSeen!));
    }
    this.emitter.on(event, listener);
  }

  off(event: "change", listener: (value: T) => void) {
    this.emitter.off(event, listener);
  }
}

export function createShimClient() {
  return addRetriesForUnavailable(
    zShimNotifierService,
    makeClient(zShimNotifierService, HostPort.forShim().rpc)
  );
}
