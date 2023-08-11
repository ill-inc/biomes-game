import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";
import type { ZodType } from "zod";
import { z } from "zod";

export type ShardManagerDomain = "anima" | "newton" | `gaia-${string}`;

export const zShardManagerDomain = z.string() as ZodType<ShardManagerDomain>;

export interface ShardDomainConfig {
  name: ShardManagerDomain;
  // - Balanced shifts shards around so that servers are always
  // balanced, uses a consistent hashing algorithm to minimize
  // shifts.
  // - Weighted aims to give all servers an equal weight of shards,
  // this is a per-shard reported number corresponding to processing
  // complexity. It will rebalance shards over time to achieve this.
  strategy: "balanced" | "weighted";
  // Total number of shards.
  shards?: number;
}

// Our default shard count needs to be larger than the number of participants in
// a shard domain. It affects the divisor in modulos operations. It's best to
// not change this! Anima and Gaia assume it's hardcoded right now.
// Also, being a modulos divisor, it's best as a prime number as well.
export const DEFAULT_TOTAL_SHARDS = 1009;

// Choose the best domain config for a given domain, taking the
// longest name prefix match.
export function chooseShardDomainConfig(
  name: ShardManagerDomain,
  configs: ShardDomainConfig[]
): ShardDomainConfig {
  const matches = configs
    .filter((c) => name.startsWith(c.name))
    .sort((a, b) => b.name.length - a.name.length);
  if (matches.length > 0) {
    return matches[0];
  }
  return { name, strategy: "balanced", shards: DEFAULT_TOTAL_SHARDS };
}

export type ShardManagerEvents = {
  acquired: (index: number) => void;
  released: (index: number) => void;
};

// A shard manager will attempt to request `requestLimit` indexed shards from a
// pool of size `poolSize`. Events are fired each time a shard is aquired
// or released (a shard would be released if the `requestLimit` is decreased).
// In this context, "shard" effectively means a number that can be acquired.
export abstract class ShardManager extends (EventEmitter as new () => TypedEventEmitter<ShardManagerEvents>) {
  constructor(public readonly name: ShardManagerDomain) {
    super();
  }

  // Returns the total number of shards
  abstract readonly total: number;

  // Returns the set of all acquired shards.
  abstract readonly held: ReadonlySet<number>;

  // Report the observed weight for a shard.
  abstract reportWeight(shard: number, weight: number): void;

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
}
