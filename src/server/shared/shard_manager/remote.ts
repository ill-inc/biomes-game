import type { ShardManagerDomain } from "@/server/shared/shard_manager/api";
import {
  DEFAULT_TOTAL_SHARDS,
  ShardManager,
  chooseShardDomainConfig,
} from "@/server/shared/shard_manager/api";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { BackgroundTaskController, waitForAbort } from "@/shared/abort";
import { EmitterScope } from "@/shared/events";
import { log } from "@/shared/logging";
import { ConditionVariable, Latch, sleep } from "@/shared/util/async";
import { assertNever } from "@/shared/util/type_helpers";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

export const zResetShardsEvent = z.object({
  kind: z.literal("reset"),
  values: z.set(z.number()),
});

export const zDeltaShardsEvent = z.object({
  kind: z.literal("delta"),
  delta: z.map(z.number(), z.boolean()),
});

export const zShardManagerEvent = z.discriminatedUnion("kind", [
  zResetShardsEvent,
  zDeltaShardsEvent,
]);

export type ShardManagerEvent = z.infer<typeof zShardManagerEvent>;

export const zReportWeightRequest = z.object({
  shard: z.number(),
  weight: z.number(),
});

export type ReportWeightRequest = z.infer<typeof zReportWeightRequest>;

export const zShardManagerService = zservice("shard-manager")
  .addRpc("reportWeight", zReportWeightRequest, z.void())
  .addRpc("start", z.void(), z.void())
  .addRpc("stop", z.void(), z.void())
  .addStreamingRpc("events", z.string(), zShardManagerEvent);

export type ShardManagerServiceClient = ZClient<typeof zShardManagerService>;

function makeResetDelta(
  current: ReadonlySet<number>,
  target: ReadonlySet<number>
): Map<number, boolean> {
  const result = new Map<number, boolean>();
  for (const index of current) {
    if (!target.has(index)) {
      result.set(index, false);
    }
  }
  for (const index of target) {
    if (!current.has(index)) {
      result.set(index, true);
    }
  }
  return result;
}

export class RemoteShardManager extends ShardManager {
  private readonly controller = new BackgroundTaskController();
  private readonly initialized = new Latch();
  public readonly held = new Set<number>();

  private constructor(
    private readonly client: ShardManagerServiceClient,
    name: ShardManagerDomain
  ) {
    super(name);
    this.controller.runInBackground("listenForEvents", (signal) =>
      this.listenForEvents(signal)
    );
  }

  get total() {
    return (
      chooseShardDomainConfig(this.name, CONFIG.shardManagerDomains).shards ??
      DEFAULT_TOTAL_SHARDS
    );
  }

  static async connect(
    client: ShardManagerServiceClient,
    name: ShardManagerDomain,
    signal?: AbortSignal
  ) {
    const manager = new RemoteShardManager(client, name);
    log.info("Waiting for shard manager to initialize", { name });
    if (signal) {
      await Promise.race([manager.initialized.wait(), waitForAbort(signal)]);
    } else {
      await manager.initialized.wait();
    }
    log.info("Shard manager initialized", {
      name,
      heldShards: manager.held.size,
    });
    return manager;
  }

  private update(delta: Map<number, boolean>) {
    for (const [idx, added] of delta) {
      if (added) {
        this.held.add(idx);
        this.emit("acquired", idx);
      } else {
        this.held.delete(idx);
        this.emit("released", idx);
      }
    }
  }

  private async listenForEvents(signal: AbortSignal) {
    do {
      try {
        for await (const event of this.client.events(this.name, signal)) {
          switch (event.kind) {
            case "reset":
              this.update(makeResetDelta(this.held, event.values));
              this.initialized.signal();
              break;
            case "delta":
              this.update(event.delta);
              break;
            default:
              assertNever(event);
          }
        }
      } catch (error) {
        log.error("Error listening for shard manager events", { error });
      }
    } while (await sleep(CONFIG.remoteShardManagerListenBackoffMs, signal));
  }

  async start() {
    await this.client.start();
  }

  reportWeight(shard: number, weight: number): void {
    this.controller.runInBackground("reportWeight", () =>
      this.client.reportWeight({ shard, weight })
    );
  }

  async stop(): Promise<void> {
    await this.controller.abortAndWait();
    this.update(makeResetDelta(this.held, new Set()));
    await this.client.stop();
  }
}

export class ShardManagerServiceImpl
  implements ZService<typeof zShardManagerService>
{
  constructor(private readonly backing: ShardManager) {}

  async reportWeight(
    _context: RpcContext,
    { shard, weight }: ReportWeightRequest
  ) {
    this.backing.reportWeight(shard, weight);
  }

  async start(_context: RpcContext) {
    await this.backing.start();
  }

  async stop(_context: RpcContext) {
    await this.backing.stop();
  }

  async *events(context: RpcContext): AsyncIterable<ShardManagerEvent> {
    const buffer = new Map<number, boolean>();
    const cv = new ConditionVariable();

    const scope = new EmitterScope(this.backing);
    scope.on("acquired", (idx) => {
      buffer.set(idx, true);
      cv.signal();
    });
    scope.on("released", (idx) => {
      buffer.set(idx, false);
      cv.signal();
    });
    scope.onAbort(context.signal, () => cv.signal());

    try {
      yield { kind: "reset", values: new Set(this.backing.held) };
      while (!context.signal.aborted) {
        if (buffer.size === 0) {
          await cv.wait();
        }
        if (context.signal.aborted) {
          return;
        }
        const delta = new Map(buffer);
        buffer.clear();
        yield { kind: "delta", delta };
      }
    } finally {
      scope.off();
    }
  }
}
