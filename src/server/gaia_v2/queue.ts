import { DelayQueue } from "@/server/gaia_v2/simulations/utils";
import { Clock } from "@/server/gaia_v2/util/clock";
import { positionHash } from "@/server/gaia_v2/util/hashing";
import { voxelShard, type ShardId } from "@/shared/game/shard";
import { log } from "@/shared/logging";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import { ConditionVariable } from "@/shared/util/async";

export const LOGGED_SHARD = voxelShard(0, 0, 0);
export const LOGGED_SM_SHARD = Math.abs(positionHash([0, 0, 0])) % 1009;

export function maybeLog(shard: ShardId, message: string) {
  if (shard === LOGGED_SHARD) {
    log.info(`ShardId(0,0,0): ${message}`, { gaiaGap: true });
  }
}

export interface QueueSharder {
  readonly heldValues: ReadonlySet<ShardId>;
  on(
    event: "change",
    listener: (delta: ReadonlyMap<ShardId, boolean>) => void
  ): this;
  off(
    event: "change",
    listener: (delta: ReadonlyMap<ShardId, boolean>) => void
  ): this;
}

export interface SimulationQueue {
  // Push some shards into the queue to be processed as soon as possible.
  // Returns the number of accepted shards.
  push(...shardIds: ShardId[]): number;

  // Defer a shard for processing after some delay.
  defer(shardId: ShardId, delayMs: number): void;

  // Gets some shards to work on immediately.
  pop(signal: AbortSignal): Promise<Array<ShardId>>;

  // Any high-priority elements currently pending. This is to support handoff
  // to another Gaia instance.
  pending(): ShardId[];

  // Stop and cleanup anything.
  stop(): void;
}

const queueCount = createCounter({
  name: `gaia_simulation_queue_count`,
  help: `Number of shards queued for processing by each simulation`,
  labelNames: ["name", "queue"],
});

const queuePending = createGauge({
  name: `gaia_simulation_queue_pending`,
  help: `Number of shards pending for processing by each simulation`,
  labelNames: ["name", "queue"],
});

// Blocking queue implementation that only yields work when there is work
// to be done. Consists of three sub-queues;
// - high: high priority tasks to pull from immediately.
// - low: low priority tasks to pull from when high is low
// - delayed: tasks deferred to another time
// It will pull from low only once high is exhausted.
// Differences include:
// - It will block on an empty queue rather than return nothing.
// - It does not have a degenerate low queue, instead it adds shards to the
//   low priority as they are added to the sharder.
export class BlockingQueue {
  private readonly high = new Set<ShardId>();
  private readonly low = new Set<ShardId>();
  private readonly delayed = new DelayQueue<ShardId>();
  private readonly cv = new ConditionVariable();

  constructor(
    private readonly name: string,
    private readonly sharder: QueueSharder,
    private readonly reducer: (set: Set<ShardId>) => void,
    private readonly clock = new Clock()
  ) {
    for (const shard of sharder.heldValues) {
      this.low.add(shard);
    }
    sharder.on("change", this.onChangeShards);
  }

  private onChangeShards = (delta: ReadonlyMap<ShardId, boolean>) => {
    // Enqueue the new shards if they are not already in a high
    // or delayed queue state.
    for (const [shard, added] of delta) {
      if (!added) {
        // Note: We don't handle shard removal, pop() will just
        // filter out any shards that are no longer held.
        maybeLog(shard, "no longer held");
        continue;
      }
      if (!this.high.has(shard) && !this.delayed.has(shard)) {
        maybeLog(shard, "now held, queueing in low queue");
        this.low.add(shard);
      } else {
        maybeLog(shard, "now held, already queued");
      }
    }
    this.cv.signal();
  };

  pending() {
    return Array.from([...this.high, ...this.delayed.peekAll()]);
  }

  stop() {
    this.sharder.off("change", this.onChangeShards);
    this.cv.signal();
  }

  // Push some elements to the high queue now, removing from others.
  push(...shardIds: ShardId[]) {
    let accepted = 0;
    for (const shard of shardIds) {
      if (!this.sharder.heldValues.has(shard)) {
        maybeLog(shard, "pushed, but not held");
        continue;
      }
      maybeLog(shard, "pushed to high queue");
      accepted++;
      this.high.add(shard);
      this.low.delete(shard);
      this.delayed.delete(shard);
    }
    if (accepted > 0) {
      this.cv.signal();
    }
    return accepted;
  }

  defer(shard: ShardId, delayMs: number) {
    if (!this.high.has(shard)) {
      this.low.delete(shard);
      this.delayed.schedule(shard, this.clock.delayedTime(delayMs));
      this.cv.signal();
    }
  }

  // Wait for:
  // - condition signal indicating something was pushed
  // - abort signal indicating give up
  // - min delay timeout indicating something was deferred
  private async waitForChange(signal: AbortSignal) {
    return new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      let timeout: NodeJS.Timeout | undefined;

      // Done waiting, doesn't mean success.
      const done = () => {
        signal.removeEventListener("abort", done);
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        // In case abort or timeout, wait the CV to unblock the promise
        // we would otherwise leak.
        this.cv.signal();
        resolve();
      };

      signal.addEventListener("abort", done, { once: true });
      void this.cv.wait().then(done);

      // Handle a delayed item.
      if (this.delayed.lwm !== undefined) {
        // Add a bit of delay to account for timer-skew.
        timeout = setTimeout(done, this.delayed.lwm + 10 - this.clock.now());
      }
    });
  }

  async pop(signal: AbortSignal, blockedCbForTests?: () => void) {
    const batch: ShardId[] = [];

    // When adding items to the batch respect the batch size, also
    // filter by the latest known shard state.
    const includeInBatch = (source: Set<ShardId>) => {
      this.reducer(source);
      for (const shard of source) {
        if (batch.length >= CONFIG.gaiaShardsPerBatch) {
          return;
        }
        source.delete(shard);
        if (!this.sharder.heldValues.has(shard)) {
          maybeLog(shard, "dropped as not held");
          continue;
        }
        maybeLog(shard, "popped");
        batch.push(shard);
      }
    };

    while (!signal.aborted) {
      // Handle any delayed items.
      this.push(...this.delayed.pop(this.clock.now()));

      // Grab what we can from the queues.
      includeInBatch(this.high);
      includeInBatch(this.low);

      if (batch.length > 0) {
        break;
      }

      // We didn't make a batch at all, wait for more shards to be added.
      blockedCbForTests?.();
      await this.waitForChange(signal);
    }

    // Update stats.
    queueCount.inc({ name: this.name, queue: "lo" }, this.low.size);
    queueCount.inc({ name: this.name, queue: "hi" }, this.high.size);
    queuePending.set({ name: this.name, queue: "lo" }, this.low.size);
    queuePending.set({ name: this.name, queue: "hi" }, this.high.size);
    queuePending.set({ name: this.name, queue: "delayed" }, this.delayed.size);
    return batch;
  }
}

export function createQueue(
  name: string,
  sharder: QueueSharder,
  reducer: (set: Set<ShardId>) => void
): SimulationQueue {
  switch (process.env.GAIA_QUEUE_TYPE) {
    default:
    case "blocking":
      return new BlockingQueue(name, sharder, reducer);
  }
}
