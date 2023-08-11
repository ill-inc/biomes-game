import { LOGGED_SM_SHARD } from "@/server/gaia_v2/queue";
import type { ServiceDiscoveryApi } from "@/server/shared/discovery/api";
import { generateNonce } from "@/server/shared/nonce";
import type { ShardManagerDomain } from "@/server/shared/shard_manager/api";
import { ShardManager } from "@/server/shared/shard_manager/api";
import { ShardDomainConfigWatcher } from "@/server/shared/shard_manager/config";
import { log } from "@/shared/logging";
import { createGauge } from "@/shared/metrics/metrics";
import { PipelineBatcher, sleep } from "@/shared/util/async";
import { hash as md5 } from "spark-md5";

// Implementation of the shard-manager API that uses a service discovery
// client as a backing. This permits it to be decentralized.
export class DistributedShardManager extends ShardManager {
  private readonly nonce = generateNonce();
  private readonly config: ShardDomainConfigWatcher;
  private readonly batcher = new PipelineBatcher(() => this.balance());
  public readonly held = new Set<number>();

  constructor(
    private readonly discovery: ServiceDiscoveryApi,
    name: ShardManagerDomain
  ) {
    super(name);
    this.config = new ShardDomainConfigWatcher(
      name,
      () => void this.batcher.invalidate()
    );
    this.discovery.on("change", () => void this.batcher.invalidate());

    createGauge({
      name: "shard_manager_held_shards",
      help: "Number of shards currently held by this server.",
      labelNames: ["name"],
      collect: (g) => g.set({ name }, this.held.size),
    });
    createGauge({
      name: "shard_manager_total_shards",
      help: "Number of shards to be shared across servers.",
      labelNames: ["name"],
      collect: (g) => {
        g.set({ name }, this.config.shards);
      },
    });
  }

  private warnNoWeightSupport() {
    log.throttledError(
      30000,
      "Distributed shard manager does not support weighted balancing - using balanced strategy",
      { domain: this.name }
    );
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

  // Balance using Rendezvous Hashing by choosing the maximal hash value.
  // https://en.wikipedia.org/wiki/Rendezvous_hashing
  // This will both equally distribute shards, but also minimize changes when
  // a server disappears (as only its shards would be reallocated).
  private async balance() {
    if (this.config.strategy !== "balanced") {
      this.warnNoWeightSupport();
    }
    const hasLoggedShard = this.held.has(LOGGED_SM_SHARD);
    if (hasLoggedShard) {
      log.info("ShardId(0,0,0) holder rebalancing", { gaiaGap: true });
    } else {
      log.info("Distributed rebalancing", { gaiaGap: true });
    }
    const nonces = await this.discovery.discover();
    const updated = new Set<number>();
    for (let shard = 0; shard < this.config.shards; shard++) {
      let maxNonce: undefined | string;
      let maxHash: undefined | string;
      for (const nonce of nonces) {
        const hash = md5(`${nonce}:${shard}`);
        if (maxHash === undefined || hash > maxHash) {
          maxHash = hash;
          maxNonce = nonce;
        }
      }
      if (maxNonce === this.nonce) {
        updated.add(shard);
      }
    }
    this.updateHeld(updated);
    if (this.held.has(LOGGED_SM_SHARD)) {
      log.info("ShardId(0,0,0) now here", { gaiaGap: true });
    } else if (hasLoggedShard) {
      log.info("ShardId(0,0,0) now gone", { gaiaGap: true });
    }
  }

  get total() {
    return this.config.shards;
  }

  reportWeight(_shard: number, _weight: number): void {
    this.warnNoWeightSupport();
  }

  async start() {
    log.info("Starting distributed shard manager", { gaiaGap: true });
    await this.discovery.publish(this.nonce);
    await this.batcher.invalidate();
    log.info("STARTED distributed shard manager", { gaiaGap: true });
  }

  async stop() {
    log.info("Unpublishing discovery", {
      gaiaGap: true,
    });
    await this.discovery.unpublish();
    // Wait some time for others to notice we've went away, in this
    // period the discovery client should typically publish our own
    // release of shards due to the stop.
    await sleep(CONFIG.distributedShutdownWaitMs);
    log.info("Stopping distributed shard manager", { gaiaGap: true });
    await this.discovery.stop();
    log.info("Clearing held shards forcibly", { gaiaGap: true });
    // Clear our held shards anyway
    this.updateHeld();
  }
}
