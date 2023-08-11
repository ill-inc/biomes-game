import type {
  ShardManager,
  ShardManagerEvents,
} from "@/server/shared/shard_manager/api";
import { EmitterSubscription } from "@/shared/events";
import { DefaultMap } from "@/shared/util/collections";
import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";

export type ValueSharderEvents<Value> = {
  change: (delta: Map<Value, boolean>) => void;
};

// This helper class makes it easier to solve the problem of how to translate a
// set of held shards into a set of held values. For example, if we hold shards
// 1, 2, and 3 out of 10, then what entities do we hold? And what if the set
// of entities change, or the set of shards that we hold changes? This class
// efficiently manages a `heldValues` set derived from the set of all changes
// and the set of held shards.
export class ValueSharder<Value, Update> extends (EventEmitter as new <
  Value
>() => TypedEventEmitter<ValueSharderEvents<Value>>)<Value> {
  private toShardIndex = new Map<Value, number>();
  private byShardIndex = new DefaultMap<number, Set<Value>>(() => new Set());

  #heldShards = new Set<number>();
  #heldValues = new Set<Value>();

  constructor(
    private readonly assignShard: (
      update: Update
    ) => [Value, number | undefined]
  ) {
    super();
    this.setMaxListeners(10_000);
  }

  get heldValues(): ReadonlySet<Value> {
    return this.#heldValues;
  }

  get heldShards(): ReadonlySet<number> {
    return this.#heldShards;
  }

  valuesForShard(shardIndex: number): ReadonlySet<Value> | undefined {
    return this.byShardIndex.peek(shardIndex);
  }

  addHeldShards(shardIndices: number[]): Value[] {
    const added: Value[] = [];
    for (const index of shardIndices) {
      if (!this.#heldShards.has(index)) {
        this.#heldShards.add(index);
        for (const value of this.byShardIndex.get(index)) {
          this.#heldValues.add(value);
          added.push(value);
        }
      }
    }
    this.emit("change", new Map(added.map((v) => [v, true])));
    return added;
  }

  removeHeldShards(shardIndices: number[]): Value[] {
    const removed: Value[] = [];
    for (const index of shardIndices) {
      if (this.#heldShards.has(index)) {
        this.#heldShards.delete(index);
        for (const value of this.byShardIndex.get(index)) {
          this.#heldValues.delete(value);
          removed.push(value);
        }
      }
    }
    this.emit("change", new Map(removed.map((v) => [v, false])));
    return removed;
  }

  update(updates: Update[]) {
    const delta = new Map();
    for (const update of updates) {
      const [value, newShard] = this.assignShard(update);
      const existingShard = this.toShardIndex.get(value);
      if (existingShard === newShard) {
        continue;
      }
      if (existingShard !== undefined) {
        if (this.removeValue(value)) {
          if (newShard === undefined) {
            delta.set(value, false);
          }
        }
      }
      if (newShard !== undefined) {
        if (this.addValue(value, newShard)) {
          if (existingShard === undefined) {
            delta.set(value, true);
          }
        }
      }
    }
    this.emit("change", delta);
  }

  private removeValue(value: Value) {
    const shardIndex = this.toShardIndex.get(value);
    if (shardIndex !== undefined) {
      this.toShardIndex.delete(value);
      this.byShardIndex.get(shardIndex).delete(value);
      return this.#heldValues.delete(value);
    }
    return false;
  }

  private addValue(value: Value, shardIndex: number) {
    this.toShardIndex.set(value, shardIndex);
    this.byShardIndex.get(shardIndex).add(value);
    if (this.#heldShards.has(shardIndex)) {
      this.#heldValues.add(value);
      return true;
    }
    return false;
  }
}

// Helper function to connect the ShardManager emit events to the ValueSharder
// public methods.
export function subscribeSharderToShardManager<Value, Update>(
  shardManager: ShardManager,
  sharder: ValueSharder<Value, Update>
) {
  const shardManagerSubscription = new EmitterSubscription<ShardManagerEvents>(
    shardManager,
    {
      acquired: (shardIndex) => {
        sharder.addHeldShards([shardIndex]);
      },
      released: (shardIndex) => {
        sharder.removeHeldShards([shardIndex]);
      },
    }
  );
  sharder.addHeldShards([...shardManager.held]);
  return shardManagerSubscription;
}
