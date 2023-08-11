import type { SimulationQueue } from "@/server/gaia_v2/queue";
import { createQueue } from "@/server/gaia_v2/queue";
import type { Sharder } from "@/server/gaia_v2/sharder";
import type {
  Simulation,
  SimulationName,
} from "@/server/gaia_v2/simulations/api";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import type { TerrainEmitter } from "@/server/gaia_v2/terrain/emitter";
import type { Change } from "@/shared/ecs/change";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import type { ShardId } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { TimeWindow } from "@/shared/util/throttling";

const runningSimulation = createGauge({
  name: `gaia_simulation_running`,
  help: `Marker for running simulations, useful for joins`,
  labelNames: ["name"],
});

const invalidationCount = createCounter({
  name: `gaia_simulation_invalidation_count`,
  help: `Number of simulation simulation invalidations`,
  labelNames: ["name"],
});
const processedCount = createCounter({
  name: `gaia_simulation_processed_count`,
  help: `Number of simulation simulation shards processed`,
  labelNames: ["name"],
});
const changeCount = createCounter({
  name: `gaia_simulation_changes_count`,
  help: `Number of simulation world changes`,
  labelNames: ["name"],
});
const updateDuration = createCounter({
  name: `gaia_simulation_update_duration_ms`,
  help: `Update duration of each simulation`,
  labelNames: ["name"],
});

// The SimulationRunner is responsible for driving the loop of a given simulation.
// For a given change, a simulation returns any world shards that need to be updated
// immediately. Otherwise, the simulation wrapper will eventually feed all owned world
// shards to the simulation for updating.
export class SimulationRunner {
  private readonly queue: SimulationQueue;
  private readonly updateThrottle: TimeWindow<BiomesId>;

  constructor(
    private readonly replica: GaiaReplica,
    sharder: Sharder,
    private readonly emitter: TerrainEmitter,
    private readonly simulation: Simulation
  ) {
    runningSimulation.set({ name: this.name }, 1);
    this.queue = createQueue(this.name, sharder, (set) =>
      this.simulation.reduce(set)
    );
    this.updateThrottle = new TimeWindow(
      CONFIG.gaiaShardThrottleMs.find((x) => x[0] === this.name)?.[1] ?? 0
    );
  }

  pending(): ShardId[] {
    return this.queue.pending();
  }

  stop() {
    this.queue.stop();
  }

  get name(): SimulationName {
    return this.simulation.name;
  }

  push(shards: ShardId[]) {
    const count = this.queue.push(...shards);
    invalidationCount.inc({ name: this.name }, count);
  }

  handleChange(change: Change) {
    // Push all invalidated IDs into the queue.
    this.push(this.simulation.invalidate(change));
  }

  async tick(signal: AbortSignal): Promise<void> {
    const { name } = this.simulation;

    if (CONFIG.gaiaDisabledSimulations.includes(name)) {
      return;
    }

    // Acquire the next set of shards to update.
    const batch = await this.queue.pop(signal);
    if (signal.aborted || batch.length === 0) {
      return;
    }
    processedCount.inc({ name }, batch.length);

    const timer = new Timer();
    for (const shardId of batch) {
      const shard = this.replica.table.get(
        TerrainShardSelector.query.key(shardId)
      );
      if (!shard) {
        continue;
      }
      if (this.updateThrottle.throttleOrUse(shard.id)) {
        this.queue.defer(shardId, this.updateThrottle.waitTime(shard.id) ?? 0);
        continue;
      }

      const [version] = this.replica.table.getWithVersion(shard.id);
      const result = await this.simulation.update(shard, version);
      if (result?.changes) {
        this.emitter.pushChange(...result.changes);
      }
      if (result?.update?.kind === "requeue") {
        if (result.update.afterDelayMs) {
          this.queue.defer(shardId, result.update.afterDelayMs);
        } else {
          this.queue.push(shardId);
        }
      }
    }

    updateDuration.inc({ name }, timer.elapsed / batch.length);

    // Flush any pending changes.
    const emitterResult = await this.emitter.flush();
    if (emitterResult === "aborted") {
      this.queue.push(...batch); // Requeue on publish failure
    } else {
      changeCount.inc({ name }, emitterResult);
    }
  }
}
