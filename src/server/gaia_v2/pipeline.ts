import type { GaiaServerContext } from "@/server/gaia_v2/context";
import type { Sharder } from "@/server/gaia_v2/sharder";
import type { Simulation } from "@/server/gaia_v2/simulations/api";
import { SimulationRunner } from "@/server/gaia_v2/simulations/runner";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import type { TerrainEmitter } from "@/server/gaia_v2/terrain/emitter";
import type { GaiaPubSub } from "@/server/gaia_v2/util/pubsub";
import type { GaiaPubSubUpdate } from "@/server/shared/pubsub/api";
import { BackgroundTaskController } from "@/shared/abort";
import type { ListenerKey } from "@/shared/events";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { yieldToOthers } from "@/shared/util/async";
import { ok } from "assert";

const gaiaPipelineTaskCount = createCounter({
  name: "gaia_pipeline_task_count",
  help: "Number of tasks processed by Gaia",
});

export class Pipeline {
  private readonly controller = new BackgroundTaskController();
  private readonly simulationRunners: SimulationRunner[];
  private changeSubscription?: ListenerKey;

  constructor(
    private readonly replica: GaiaReplica,
    private readonly pubsub: GaiaPubSub,
    sharder: Sharder,
    emitter: TerrainEmitter,
    simulations: Simulation[]
  ) {
    this.simulationRunners = simulations.map((simulation) => {
      return new SimulationRunner(this.replica, sharder, emitter, simulation);
    });
    this.pubsub.on(this.onPubSub);
  }

  private onPubSub = (update: GaiaPubSubUpdate) => {
    for (const [simulationName, shardIds] of update) {
      const runner = this.simulationRunners.find(
        (r) => r.name === simulationName
      );
      if (runner) {
        runner.push(shardIds);
      }
    }
  };

  async start() {
    ok(!this.changeSubscription, `Cannot restart a pipeline!`);
    this.changeSubscription = this.replica.on("tick", (changes) => {
      for (const change of changes) {
        for (const simulation of this.simulationRunners) {
          simulation.handleChange(change);
        }
      }
    });

    for (const runner of this.simulationRunners) {
      this.controller.runInBackground(`sim-${runner.name}`, async (signal) => {
        try {
          // Yield to others always to ensure between work batches there is
          // room for metrics, healthchecks, etc.
          while (await yieldToOthers(signal)) {
            await runner.tick(signal);
            gaiaPipelineTaskCount.inc();
          }
        } catch (error) {
          log.fatal(`Error in simulation: ${runner.name}`, {
            error,
          });
        }
      });
    }
  }

  pending(): GaiaPubSubUpdate {
    return this.simulationRunners.map((runner) => [
      runner.name,
      runner.pending(),
    ]);
  }

  async stop() {
    await this.controller.abortAndWait();
    this.replica.off("tick", this.changeSubscription);
    this.pubsub.off(this.onPubSub);
    for (const runner of this.simulationRunners) {
      runner.stop();
    }
  }
}

export async function registerGaiaPipeline<C extends GaiaServerContext>(
  loader: RegistryLoader<C>
) {
  const [replica, pubsub, sharder, emitter, simulations] = await Promise.all([
    loader.get("replica"),
    loader.get("pubsub"),
    loader.get("sharder"),
    loader.get("terrainEmitter"),
    loader.get("simulations"),
  ]);
  return new Pipeline(replica, pubsub, sharder, emitter, simulations);
}
