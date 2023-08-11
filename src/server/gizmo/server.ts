import { GizmoEcs } from "@/server/gizmo/ecs";
import { Gremlin } from "@/server/gizmo/gremlin";
import type { GizmoServerContext } from "@/server/gizmo/main";
import { RESERVED_GREMLIN_IDS } from "@/server/gizmo/reserved_ids";
import {
  statefulSetIndex,
  statefulSetReplicas,
} from "@/server/shared/statefulset";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Gauge } from "@/shared/metrics/metrics";
import { createGauge } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { hostname } from "os";

export class GizmoServer {
  private readonly controller = new BackgroundTaskController();
  private readonly gremlins: Gremlin[] = [];
  private readonly index: number;
  private readonly replicas: number;
  private readonly maxPossibleOverallGremlins: number;
  private readonly idPool: BiomesId[] = [];
  private readonly ecs: GizmoEcs;

  constructor(voxeloo: VoxelooModule, private readonly worldApi: WorldApi) {
    log.info(`Starting gizmo server with hostname: ${hostname()}`);
    if (process.env.NODE_ENV === "production") {
      this.index = statefulSetIndex();
      this.replicas = statefulSetReplicas();
    } else {
      this.index = 0;
      this.replicas = 1;
    }
    log.info(
      `Starting gizmo server instance ${this.index} of ${this.replicas} replicas`
    );

    if (this.replicas <= 0) {
      log.warn("Gizmo server in invalid configuration: no replicas");
      this.maxPossibleOverallGremlins = 0;
    } else {
      const idsPerReplica = Math.floor(
        RESERVED_GREMLIN_IDS.length / this.replicas
      );
      this.maxPossibleOverallGremlins = idsPerReplica * this.replicas;
      this.idPool = RESERVED_GREMLIN_IDS.slice(
        this.index * idsPerReplica,
        (this.index + 1) * idsPerReplica
      );
    }

    this.ecs = new GizmoEcs(voxeloo, worldApi);

    createGauge({
      name: "real_gremlins",
      help: "Real gremlins in being run by Gizmo",
      collect: (gauge: Gauge) => {
        gauge.set(this.gremlins.length);
      },
    });
  }

  // Determine the gremlins this server should be running.
  // Each server in the stateful set runs an equivalent share of the overall total,
  // however server-0 will pick up any slack if there are excess (i.e. they don't
  // divide evenly).
  private determineTargetCount(): number {
    const overallTarget = Math.min(
      this.maxPossibleOverallGremlins,
      Math.ceil(CONFIG.gremlinsPopulation)
    );
    if (overallTarget <= 0) {
      return 0;
    }
    const targetPerReplica = Math.floor(overallTarget / this.replicas);
    if (this.index > 0) {
      return targetPerReplica;
    }
    // All the extras go in replica 0.
    return targetPerReplica + (overallTarget % this.replicas);
  }

  async start() {
    await this.ecs.start();
    log.info("Starting management of gremlins...");
    this.controller.runInBackground("tick", (signal) => this.run(signal));
  }

  private async run(signal: AbortSignal) {
    while (await sleep(CONFIG.gremlinsTickIntervalMs, signal)) {
      try {
        await this.tick();
      } catch (error) {
        log.warn("Error ticking gremlins", { error });
      }
    }
    await Promise.all(this.gremlins.map((gremlin) => gremlin.stop()));
    this.gremlins.length = 0;
  }

  private async tick() {
    const targetCount = this.determineTargetCount();
    // Stop any extra gremlins.
    while (this.gremlins.length > targetCount) {
      const old = this.gremlins.pop()!;
      await old.stop();
      this.idPool.splice(0, 0, old.id); // Push back at the front.
    }
    // Bring up new gremlins.
    while (this.gremlins.length < targetCount) {
      const id = this.idPool.pop();
      ok(id, "Exhausted all gremlin IDs!");
      this.gremlins.push(new Gremlin(id, this.ecs));
    }
    // Run all gremlins.
    await Promise.all(this.gremlins.map((gremlin) => gremlin.tick()));
    this.ecs.gc();
  }

  async stop() {
    await this.controller.abortAndWait();
    await this.ecs.stop();
  }
}

export async function registerGizmoServer<C extends GizmoServerContext>(
  loader: RegistryLoader<C>
) {
  const [voxeloo, worldApi] = await Promise.all([
    loader.get("voxeloo"),
    loader.get("worldApi"),
  ]);
  return new GizmoServer(voxeloo, worldApi);
}
