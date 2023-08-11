import {
  BlockingQueue,
  type QueueSharder,
  type SimulationQueue,
} from "@/server/gaia_v2/queue";
import type { ShardId } from "@/shared/game/shard";
import assert from "assert";
import { EventEmitter } from "events";

class FakeSharder implements QueueSharder {
  #emitter = new EventEmitter();
  #heldValues = new Set<ShardId>();

  get heldValues(): Set<ShardId> {
    return this.#heldValues;
  }

  set heldValues(values: Iterable<ShardId>) {
    const old = this.#heldValues;
    this.#heldValues = new Set(values);
    const added: ShardId[] = [];
    for (const value of this.#heldValues) {
      if (!old.has(value)) {
        added.push(value);
      }
    }
    this.#emitter.emit("change", new Map(added.map((v) => [v, true])));
  }

  on(
    event: "change",
    listener: (delta: ReadonlyMap<ShardId, boolean>) => void
  ): this {
    this.#emitter.on(event, listener);
    return this;
  }

  off(
    event: "change",
    listener: (delta: ReadonlyMap<ShardId, boolean>) => void
  ): this {
    this.#emitter.off(event, listener);
    return this;
  }
}

const A = "a" as ShardId;
const B = "b" as ShardId;
const C = "c" as ShardId;
const D = "d" as ShardId;
const E = "e" as ShardId;

async function fetch(queue: SimulationQueue, count: number) {
  const out: ShardId[] = [];
  while (out.length < count) {
    out.push(...(await queue.pop(new AbortController().signal)));
  }
  return out.slice(0, count);
}

function standardQueueTests(context: () => [SimulationQueue, FakeSharder]) {
  let queue!: SimulationQueue;
  let sharder!: FakeSharder;

  beforeEach(() => {
    [queue, sharder] = context();
  });

  it("Aborted fetch returns empty", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await queue.pop(controller.signal);
    assert.deepEqual(result, []);
  });
  it("Will process all shards at least once", async () => {
    sharder.heldValues = [A, B, C, D, E];
    assert.deepEqual(await fetch(queue, 5), [A, B, C, D, E]);
  });

  it("Will only process held shards", async () => {
    sharder.heldValues = [A, C, E];
    assert.deepEqual(await fetch(queue, 3), [A, C, E]);
  });

  it("Will prioritize changed shards", async () => {
    sharder.heldValues = [A, B, C, D, E];
    queue.push(D);
    assert.ok((await fetch(queue, 5))[0], D);
  });

  it("Will prioritize changed 2 shards", async () => {
    sharder.heldValues = [A, B, C, D, E];
    queue.push(D);
    queue.push(B);
    assert.deepEqual((await fetch(queue, 5)).slice(0, 2), [D, B]);
  });

  it("Will ignore pushes to not held shards", async () => {
    sharder.heldValues = [A, C, E];
    queue.push(B);
    assert.deepEqual(await fetch(queue, 3), [A, C, E]);
  });
}

describe("Blocking SimulationQueue Tests", () => {
  let queue!: BlockingQueue;
  let sharder!: FakeSharder;

  beforeEach(() => {
    sharder = new FakeSharder();
    queue = new BlockingQueue("testq", sharder, () => {});
  });

  afterEach(() => queue.stop());

  standardQueueTests(() => [queue, sharder]);

  it("Blocks when done", async () => {
    sharder.heldValues = [A, B, C, D, E];
    assert.deepEqual(await fetch(queue, 5), [A, B, C, D, E]);

    let wasBlocked = false;
    const controller = new AbortController();
    const promise = queue.pop(controller.signal, () => {
      wasBlocked = true;
      controller.abort();
    });

    assert.ok(wasBlocked);
    // Should progress now.
    assert.deepEqual(await promise, []);
  });
});
