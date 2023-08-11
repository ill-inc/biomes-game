import type { BDB } from "@/server/shared/storage";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import { ok } from "assert";
import { remove } from "lodash";

export interface IdGenerator {
  next(): Promise<BiomesId>;
  batch(count: number): Promise<BiomesId[]>;
}

// Generated IDs are in the range 1-(2^53-5), 0 is never valid.
//  2^53-5 = 3^2×4357×229699315399 (4 prime factors, 3 distinct)
// We choose this so that the duplicate prime factor makes it a bit better
// as a base for an LCG.
export const MAX_ID = 9007199254740987n;
export const SHARDS = 4357; // Factor of 2^53-5
const SHARD_SIZE = Number(MAX_ID / BigInt(SHARDS));

// Two pass of an LCG to make the output numbers non-sequential.
// - M and C relatively prime
// - a - 1 divisible by all prime factors of M
// - a - 1 divisible by 4 if M is divisible by 4
const A = 3002399751580330n;
const C = 1n;
const M = MAX_ID;

export function lcg(x: number) {
  return Number((A * BigInt(x) + C) % M);
}

// To invert this LCG,
const B = -3002399751580328n;
const D = ((M - B) * C) % M;
export function ilcg(x: number) {
  let i = 0n;
  while (true) {
    const candidate = ((B * BigInt(x) + D) % M) + i * M;
    if (candidate > 0) {
      return candidate;
    }
    i += 1n;
  }
}

// We do not wish 0 to be a final output, as such we need to blacklist
// a given shard that contains it (we're reserving it for now).
const RESERVED_SHARD = Number(ilcg(0) / BigInt(SHARD_SIZE));

export class DbIdGenerator implements IdGenerator {
  private readonly shards: number[];

  constructor(private readonly db: BDB, availableShards?: number[]) {
    this.shards =
      availableShards ?? Array.from({ length: SHARDS }, (_, i) => i);
    remove(this.shards, (v) => v === RESERVED_SHARD);
  }

  chooseShard() {
    ok(this.shards.length > 0, "Id space exhausted");
    return this.shards[Math.floor(Math.random() * this.shards.length)];
  }

  async next(): Promise<BiomesId> {
    return (await this.batch(1))[0];
  }

  async batch(count: number): Promise<BiomesId[]> {
    ok(count < SHARD_SIZE, "Cannot allocate this many IDs in a single batch");
    const shardId = this.chooseShard();
    const shardRef = this.db.collection("id-generators").doc(String(shardId));
    const id = await this.db.runTransaction(async (t) => {
      const shard = await t.get(shardRef);
      if (!shard.exists) {
        t.create(shardRef, { next: count });
        return 0;
      }
      const id = shard.data()!.next;
      if (id >= SHARD_SIZE - count) {
        // Cannot fit in this shard, try another.
        return id;
      }
      t.update(shardRef, { next: id + count });
      return id;
    });
    if (id >= SHARD_SIZE - count) {
      // Check if it's full
      if (id >= SHARD_SIZE - 1) {
        this.shards.push(shardId);
      }
      // Shard cannot fit the batch, try again.
      return this.batch(count);
    }
    const base = id + shardId * SHARD_SIZE;
    return Array.from({ length: count }, (_, i) => lcg(base + i) as BiomesId);
  }
}
// Generate IDs with a similar distribution to a DB backed one.
export class SameDistributionTestIdGenerator implements IdGenerator {
  private nextId = new Map<number, number>();

  syncNext() {
    const shard = Math.floor(Math.random() * SHARDS);
    const id =
      this.nextId.get(shard) ?? Math.floor((Math.random() * SHARD_SIZE) / 2);
    this.nextId.set(shard, id + 1);
    return lcg(id) as BiomesId;
  }

  async next() {
    return this.syncNext();
  }

  batch(count: number): Promise<BiomesId[]> {
    return Promise.all(Array.from({ length: count }, () => this.next()));
  }
}

export async function registerIdGenerator<C extends { db: BDB }>(
  loader: RegistryLoader<C>
): Promise<IdGenerator> {
  return new DbIdGenerator(await loader.get("db"));
}
