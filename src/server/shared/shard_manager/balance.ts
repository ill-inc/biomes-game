import type { ShardDomainConfigWatcher } from "@/server/shared/shard_manager/config";
import { type ShardMapping } from "@/server/shared/shard_manager/mapping";
import { createGauge } from "@/shared/metrics/metrics";
import { DefaultMap } from "@/shared/util/collections";
import { ok } from "assert";
import { hash as md5 } from "spark-md5";

// Determine the active set of weights by considering the current known,
// the last known mapping, and set new shards to the average if absent.
function expandWeights(
  lastKnownMapping: ShardMapping,
  weights: Map<number, number>,
  totalShards: number
) {
  const expandedWeights = new Map<number, number>();
  let totalWeight = 0;
  for (let shard = 0; shard < totalShards; ++shard) {
    const weight = weights.get(shard) ?? lastKnownMapping.weights?.get(shard);
    if (weight === undefined) {
      // No weight, so don't allocate.
      continue;
    }
    expandedWeights.set(shard, weight);
    totalWeight += weight;
  }
  if (totalWeight === 0) {
    totalWeight = totalShards;
  }
  for (let shard = 0; shard < totalShards; ++shard) {
    if (!expandedWeights.has(shard)) {
      // No weight, so assume the average.
      expandedWeights.set(shard, totalWeight / totalShards);
    }
  }
  return expandedWeights;
}

const unallocatedShards = createGauge({
  name: `shard_manager_unallocated_shards`,
  help: "Number of shards we could not allocate",
  labelNames: ["name"],
});

// Helper for allocating shards to servers.
class ShardAllocationBuilder {
  public readonly weights: Map<number, number>;
  #shards: Set<number>;
  #allocation = new DefaultMap<string, Set<number>>(() => new Set());
  #weightByServer = new DefaultMap<string, number>(() => 0);

  constructor(
    private readonly name: string,
    public readonly lastKnownMapping: ShardMapping,
    weights: Map<number, number>,
    public readonly totalShards: number
  ) {
    this.weights = expandWeights(lastKnownMapping, weights, totalShards);
    this.#shards = new Set(Array.from({ length: totalShards }, (_, i) => i));
  }

  // Total weight of all shards.
  get totalWeight() {
    return [...this.weights.values()].reduce((a, b) => a + b, 0);
  }

  // Attempt to allocate a shard if free to a given server by nonce.
  maybeAllocate(nonce: string, shard: number) {
    if (this.#shards.delete(shard)) {
      this.#allocation.get(nonce).add(shard);
      this.#weightByServer.set(
        nonce,
        this.#weightByServer.get(nonce)! + this.weights.get(shard)!
      );
    }
  }

  // Allocate a shard to a given server by nonce, fail if not possible.
  allocate(nonce: string, shard: number) {
    ok(this.#shards.has(shard), "Shard was already allocated");
    this.maybeAllocate(nonce, shard);
  }

  // Move a shard from one server to the other.
  move(source: string, target: string, shard: number) {
    ok(this.#allocation.get(source).delete(shard), "Shard was not allocated");
    this.#weightByServer.set(
      source,
      this.#weightByServer.get(source)! - this.weights.get(shard)!
    );
    this.#shards.add(shard);
    this.allocate(target, shard);
  }

  // Get the allocations for a given server by nonce, is safe to hold
  // a reference to this it will be updated.
  allocatedShardsFor(nonce: string): ReadonlySet<number> {
    return this.#allocation.get(nonce);
  }

  // Get the allocated weight to a given server.
  allocatedWeightFor(nonce: string) {
    return this.#weightByServer.get(nonce);
  }

  get unallocatedCount() {
    return this.#shards.size;
  }

  *unallocatedShards() {
    yield* this.#shards;
  }

  peekShard() {
    ok(this.#shards.size);
    const [shard] = this.#shards;
    return shard;
  }

  finish(): ShardMapping {
    unallocatedShards.set({ name: this.name }, this.unallocatedCount);
    return { allocation: new Map(this.#allocation), weights: this.weights };
  }
}

function createBalancedMapping(
  builder: ShardAllocationBuilder,
  serverTargets: ReadonlySet<string>
): void {
  // Balance using Rendezvous Hashing by choosing the maximal hash value.
  // https://en.wikipedia.org/wiki/Rendezvous_hashing
  // This will both equally distribute shards, but also minimize changes when
  // a server disappears (as only its shards would be reallocated).
  for (let shard = 0; shard < builder.totalShards; ++shard) {
    let maxHash: string | undefined;
    let maxServer: string | undefined;
    for (const server of serverTargets) {
      const hash = md5(`${server}:${shard}`);
      if (maxHash === undefined || hash > maxHash) {
        maxHash = hash;
        maxServer = server;
      }
    }
    builder.allocate(maxServer!, shard);
  }
}

function createWeightedMapping(
  builder: ShardAllocationBuilder,
  serverTargets: ReadonlySet<string>
): void {
  // First, retain what we can of the last mapping.
  for (const [nonce, lastAllocated] of builder.lastKnownMapping.allocation) {
    if (!serverTargets.has(nonce)) {
      // No longer exists or not available.
      continue;
    }
    for (const shard of lastAllocated) {
      builder.maybeAllocate(nonce, shard);
    }
  }

  const targetWeight = builder.totalWeight / serverTargets.size;
  const unallocatedByWeight = Array.from(builder.unallocatedShards()).sort(
    (a, b) => builder.weights.get(b)! - builder.weights.get(a)!
  );

  // Allocate any remaining shards, giving each to the lowest weight server.
  for (const shard of unallocatedByWeight) {
    let minWeight: number | undefined;
    let minServer: string | undefined;
    for (const nonce of serverTargets) {
      const serverWeight = builder.allocatedWeightFor(nonce);
      if (minWeight === undefined || serverWeight < minWeight) {
        minWeight = serverWeight;
        minServer = nonce;
      }
    }
    builder.allocate(minServer!, shard);
  }

  if (serverTargets.size > 1) {
    // Perform a rebalancing step loosely based on:
    // https://underthehood.meltwater.com/blog/2019/09/27/load-driven-shard-distribution-in-elasticsearch-story-of-an-internship/
    const maxIterations =
      CONFIG.shardManagerWeightedMaxRebalancePct * builder.totalShards;
    for (let iteration = 0; iteration < maxIterations; ++iteration) {
      // 1. Sort all nodes according to the total load on them, descending.
      const sortedServers = Array.from(serverTargets).sort(
        (a, b) => builder.allocatedWeightFor(b) - builder.allocatedWeightFor(a)
      );

      // 2. Take node N with the highest total load. We will move a shard from this node.
      const source = sortedServers[0];
      if (builder.allocatedWeightFor(source)! <= targetWeight) {
        // No need to rebalance.
        break;
      }

      // 3. Search the shards on node N and select shard S such that by removing S, N gets
      //    as close to the optimal level as possible
      const sourceAllocation = builder.allocatedShardsFor(source);
      if (sourceAllocation.size === 0) {
        // No shards to move.
        break;
      }
      let bestShard: number | undefined;
      let bestWeight: number | undefined;
      let sourceDistance: number | undefined;
      for (const shard of sourceAllocation) {
        const weight = builder.weights.get(shard)!;
        const distance = Math.abs(
          builder.allocatedWeightFor(source)! - weight - targetWeight
        );
        if (sourceDistance === undefined || distance < sourceDistance) {
          sourceDistance = distance;
          bestShard = shard;
          bestWeight = weight;
        }
      }

      // 4. Starting from the node with the lowest total load, we try to select a target node M such
      //    that the following constraints are satisfied:
      //    a. The total distance of N and M from the optimum must not increase after moving shard S
      const priorDistance = new DefaultMap<string, number>((nonce) => {
        return Math.abs(builder.allocatedWeightFor(nonce)! - targetWeight);
      });
      let target: string | undefined;
      for (let i = sortedServers.length - 1; i >= 1; --i) {
        const nonce = sortedServers[i];
        const targetDistance = Math.abs(
          builder.allocatedWeightFor(nonce)! + bestWeight! - targetWeight
        );
        if (
          sourceDistance! + targetDistance <
          priorDistance.get(source) + priorDistance.get(nonce)
        ) {
          target = sortedServers[i];
          break;
        }
      }
      if (target === undefined) {
        // No target found to rebalance, give up.
        break;
      }

      // 5. Perform the move on the simulation, return to step 2 and calculate the next optimal move
      //    according to the new state of the cluster.
      builder.move(source, target, bestShard!);
    }
  }
}

export function balanceDomain(
  name: string,
  lastKnownMapping: ShardMapping,
  weights: Map<number, number>,
  serverTargets: ReadonlySet<string>,
  config: ShardDomainConfigWatcher
): ShardMapping {
  const builder = new ShardAllocationBuilder(
    name,
    lastKnownMapping,
    weights,
    config.shards
  );

  if (builder.totalShards > 0 && serverTargets.size > 0) {
    switch (config.strategy) {
      case "balanced":
        createBalancedMapping(builder, serverTargets);
        break;
      case "weighted":
        createWeightedMapping(builder, serverTargets);
        break;
      default:
        throw new Error(`Not implemented: ${config.strategy}`);
    }
  }

  return builder.finish();
}
