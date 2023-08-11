import type {
  DistributedNotifierKey,
  Notifier,
} from "@/server/shared/distributed_notifier/api";
import { createDistributedNotifier } from "@/server/shared/distributed_notifier/notifier";
import type { Election } from "@/server/shared/election/api";
import { createElection } from "@/server/shared/election/election";
import { generateNonce } from "@/server/shared/nonce";
import { HostPort } from "@/server/shared/ports";
import type { ShardManagerDomain } from "@/server/shared/shard_manager/api";
import {
  DEFAULT_TOTAL_SHARDS,
  ShardManager,
  chooseShardDomainConfig,
  zShardManagerDomain,
} from "@/server/shared/shard_manager/api";
import { balanceDomain } from "@/server/shared/shard_manager/balance";
import { ShardDomainConfigWatcher } from "@/server/shared/shard_manager/config";
import type { ShardMapping } from "@/server/shared/shard_manager/mapping";
import {
  deserializeShardMapping,
  emptyMapping,
  serializeShardMapping,
} from "@/server/shared/shard_manager/mapping";
import { makeClient } from "@/server/shared/zrpc/client";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { BackgroundTaskController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { Latch, PipelineBatcher, sleep } from "@/shared/util/async";
import {
  DefaultMap,
  filterMapInPlace,
  mapMap,
} from "@/shared/util/collections";
import { asyncSuperBackoff } from "@/shared/util/retry_helpers";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import { isEqual } from "lodash";
import { z } from "zod";

export const zKeepaliveRequest = z.object({
  domain: zShardManagerDomain,
  nonce: z.string(),
  ttlMs: z.number(),
  weights: z.map(z.number(), z.number()).optional(),
});

export type KeepaliveRequest = z.infer<typeof zKeepaliveRequest>;

export const zKeepaliveResponse = z.enum(["ok", "not-leader"]);

export type KeepaliveResponse = z.infer<typeof zKeepaliveResponse>;

export const zBalancerService = zservice("shard-balancer").addRpc(
  "keepalive",
  zKeepaliveRequest,
  zKeepaliveResponse
);

export type BalancerClient = ZClient<typeof zBalancerService>;
export type BalancerService = ZService<typeof zBalancerService>;

class BalancerClientState {
  private readonly lastKeepalive = new Timer();
  public ttlMs: number = 0;

  get expired() {
    return this.lastKeepalive.elapsed > this.ttlMs;
  }

  keepalive() {
    this.lastKeepalive.reset();
  }
}

// Represents a single domain to balance shards within.
class BalancerDomain {
  private readonly config: ShardDomainConfigWatcher;
  private readonly clients = new Map<string, BalancerClientState>();
  private readonly weights = new Map<number, number>();
  private readonly notifier: Notifier;
  private readonly batcher = new PipelineBatcher<void>(async () => {
    await this.balance();
    // Sleep a little to batch balancing.
    await sleep(process.env.MOCHA_TEST ? 0 : CONFIG.shardManagerBalanceBatchMs);
  });
  private mapping?: ShardMapping;

  constructor(
    private readonly name: ShardManagerDomain,
    // Factory to overload the internal notifier used for tests.
    notifierFactory: (
      key: DistributedNotifierKey
    ) => Notifier = createDistributedNotifier
  ) {
    this.config = new ShardDomainConfigWatcher(name, () => {
      void this.markNeedingBalancing();
    });
    this.notifier = notifierFactory(`shard-manager:${name}`);
  }

  async markNeedingBalancing() {
    await this.batcher.invalidate();
  }

  get totalShards() {
    return this.config.shards;
  }

  get heldShards() {
    let total = 0;
    if (this.mapping) {
      for (const allocation of this.mapping.allocation.values()) {
        total += allocation.size;
      }
    }
    return total;
  }

  // Mark a given client as still alive.
  async keepalive(request: KeepaliveRequest) {
    let client = this.clients.get(request.nonce);
    if (!client) {
      if (request.ttlMs <= 0) {
        // It was shutdown of a client we didn't know about, ignore.
        return;
      }
      client = new BalancerClientState();
      this.clients.set(request.nonce, client);
    }
    client.keepalive();
    client.ttlMs = request.ttlMs;
    if (request.weights) {
      // TODO: Use known per-shard weights.
      for (const [shard, weight] of request.weights) {
        this.weights.set(shard, weight);
      }
    }
    if (client.expired) {
      // It's expired, process this immediately.
      await this.balance();
    } else {
      // Process it soon.
      await this.markNeedingBalancing();
    }
  }

  // Remove any expired clients.
  private gc() {
    for (const [nonce, client] of this.clients) {
      if (client.expired) {
        this.clients.delete(nonce);
      }
    }
  }

  // Produce and maybe broadcast a new mapping.
  private async balance() {
    if (!this.mapping) {
      // Attempt to fetch an existing mapping.
      try {
        const encoded = await this.notifier.fetch();
        this.mapping = deserializeShardMapping(encoded) ?? emptyMapping();
      } catch (error) {
        log.warn("Failed to fetch shard mapping, starting from scratch.", {
          error,
        });
        this.mapping = emptyMapping();
      }
    }
    // Garbage collect all clients.
    this.gc();
    // Produce a new mapping.
    const newMapping: ShardMapping = balanceDomain(
      this.name,
      this.mapping,
      this.weights,
      new Set(this.clients.keys()),
      this.config
    );
    if (isEqual(newMapping, this.mapping)) {
      // No change, nothing to do.
      return;
    }
    this.mapping = newMapping;
    // Notify the new mapping to all clients.
    await this.notifier.notify(serializeShardMapping(this.mapping));
  }

  async stop() {
    await this.notifier.stop();
    this.config.stop();
  }
}

// Service to keep track of keep-alives and periodically balance shards across
// all alive services in a domain.
export class BalancerServiceImpl implements BalancerService {
  private readonly controller = new BackgroundTaskController();
  private readonly domains = new DefaultMap<ShardManagerDomain, BalancerDomain>(
    (name) => new BalancerDomain(name, this.notifierFactory)
  );

  constructor(
    private readonly election: Election,
    // Factory to overload the internal notifier used for tests.
    private readonly notifierFactory?: (key: DistributedNotifierKey) => Notifier
  ) {
    createGauge({
      name: "shard_manager_total_shards",
      help: "Number of shards to be shared across servers.",
      labelNames: ["name"],
      collect: (g) => {
        for (const [name, domain] of this.domains) {
          g.set({ name }, domain.totalShards);
        }
      },
    });
    createGauge({
      name: "shard_manager_total_held_shards",
      help: "Number of shards currently held by all replicas, which all replicas have knowledge of.",
      labelNames: ["name"],
      collect: (g) => {
        for (const [name, domain] of this.domains) {
          g.set({ name }, domain.heldShards);
        }
      },
    });
  }

  static async create() {
    return new BalancerServiceImpl(await createElection("balancer"));
  }

  async start() {
    this.controller.runInBackground("election", async (signal) => {
      while (!signal.aborted) {
        log.info(`Waiting to become leader of: ${this.election.campaign}...`);
        try {
          await this.election.waitUntilElected(
            process.env.POD_IP ?? "balancer",
            async (signal) => {
              log.info("Is now leader, balancing shards");
              while (
                await sleep(
                  process.env.MOCHA_TEST
                    ? 10
                    : CONFIG.shardManagerBalanceIntervalMs,
                  signal
                )
              ) {
                for (const domain of this.domains.values()) {
                  await domain.markNeedingBalancing();
                }
              }
            },
            signal
          );
        } catch (error) {
          log.error("Error encountered trying to become lead balancer", {
            error,
          });
        }
      }
    });
  }

  async keepalive(_context: RpcContext, request: KeepaliveRequest) {
    if (!this.election.isLeader) {
      return "not-leader";
    }
    await this.domains.get(request.domain).keepalive(request);
    return "ok";
  }

  async stop() {
    await this.controller.abortAndWait();
    await Promise.all(mapMap(this.domains, (domain) => domain.stop()));
  }
}

export async function registerBalancerService(): Promise<BalancerService> {
  const service = await BalancerServiceImpl.create();
  await service.start();
  return service;
}

// Shard manager service that uses the balancer service to allocate shards.
export class ServiceShardManager extends ShardManager {
  private readonly controller = new BackgroundTaskController();
  private readonly batcher = new PipelineBatcher<void>(() =>
    this.sendKeepalive()
  );
  private readonly nonce: string;
  private readonly notifier: Notifier;
  public readonly held = new Set<number>();
  private readonly weights = new Map<number, number>();
  private readonly clients: DefaultMap<string, BalancerClient>;

  constructor(
    clientFactory: (key: string) => BalancerClient,
    name: ShardManagerDomain,
    // Election override for tests.
    private readonly election: Election,
    // Factory to overload the internal notifier used for tests.
    notifierFactory: (
      key: DistributedNotifierKey
    ) => Notifier = createDistributedNotifier
  ) {
    super(name);
    this.clients = new DefaultMap(clientFactory);
    this.nonce = generateNonce();
    this.notifier = notifierFactory(`shard-manager:${name}`);
    this.notifier.on("change", (value) => this.onMappingChange(value));

    createGauge({
      name: "shard_manager_held_shards",
      help: "Number of shards currently held by this server.",
      labelNames: ["name"],
      collect: (g) => g.set({ name }, this.held.size),
    });
  }

  static async create(
    clientFactory: (key: string) => BalancerClient,
    name: ShardManagerDomain
  ) {
    return new ServiceShardManager(
      clientFactory,
      name,
      await createElection("balancer")
    );
  }

  async start() {
    const latch = new Latch();
    this.controller.runInBackground("keepalive-ping", async (signal) => {
      do {
        await this.batcher.invalidate();
        latch.signal();
      } while (
        await sleep(
          process.env.MOCHA_TEST
            ? 10
            : CONFIG.shardManagerTtlMs / CONFIG.shardManagerKeepaliveRatio,
          signal
        )
      );
    });
    await latch.wait();
  }

  private updateHeld(updated?: Set<number>) {
    updated ??= new Set();
    for (const index of this.held) {
      if (!updated.has(index)) {
        this.held.delete(index);
        this.emit("released", index);
      }
    }
    for (const index of updated) {
      if (!this.held.has(index)) {
        this.held.add(index);
        this.emit("acquired", index);
      }
    }
  }

  private onMappingChange(value: string) {
    const mapping = deserializeShardMapping(value);
    if (!mapping) {
      return;
    }
    this.updateHeld(mapping.allocation.get(this.nonce));
  }

  private async sendKeepalive() {
    filterMapInPlace(this.weights, (_, key) => this.held.has(key));
    const request: KeepaliveRequest = {
      domain: this.name,
      nonce: this.nonce,
      ttlMs: this.controller.aborted ? 0 : CONFIG.shardManagerTtlMs,
      weights: this.weights,
    };
    try {
      await asyncSuperBackoff(
        async () => {
          const key = await this.election.getElectedValue();
          if (key === undefined) {
            throw new Error("No balancer leader");
          }
          return this.clients.get(key).keepalive(request);
        },
        (result: "ok" | "not-leader") => result === "ok",
        () => true,
        {
          baseMs: 500,
          exponent: 2,
          maxAttempts: 3,
        }
      );
    } catch (error) {
      log.error(`${this.nonce}: Failed to keepalive shard manager`, { error });
      throw error;
    }
  }

  get total() {
    return (
      chooseShardDomainConfig(this.name, CONFIG.shardManagerDomains).shards ??
      DEFAULT_TOTAL_SHARDS
    );
  }

  reportWeight(shard: number, weight: number): void {
    this.weights.set(shard, weight);
    void this.batcher.invalidate();
  }

  async stop(): Promise<void> {
    await this.controller.abortAndWait();
    await this.batcher.invalidate();
    // Wait some time for the balancer to notice we've went away, and allocate
    // our shards to someone else.
    await sleep(process.env.MOCHA_TEST ? 20 : CONFIG.shardManagerTtlMs);
    await this.notifier.stop();
    // Even if the balancer didn't notify us, clear out our shards now.
    this.updateHeld();
  }
}

export function connectToBalancer(host: string) {
  return makeClient(zBalancerService, `${host}:${HostPort.rpcPort}`);
}
