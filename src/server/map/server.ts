import type { MapContext } from "@/server/map/context";
import type { MapPipeline } from "@/server/map/pipeline";
import type { MapPreload } from "@/server/map/preload";
import type { MapStore } from "@/server/map/storage";
import type { MapReplica } from "@/server/map/table";
import { LightTrace } from "@/shared/light_trace";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";

export class MapServer {
  constructor(
    readonly pipeline: MapPipeline,
    readonly preload: MapPreload,
    readonly replica: MapReplica,
    readonly store: MapStore
  ) {}

  async start() {
    const trace = new LightTrace();

    await this.replica.start();
    trace.mark("replica");

    await this.store.start();
    trace.mark("store");

    await this.preload.start();
    trace.mark("preload");

    await this.pipeline.start();
    trace.mark("pipeline");

    log.info(`Map server running. ${trace}`);
  }

  async stop() {
    await this.pipeline.stop();
    await this.replica.stop();
    log.info(`Map server shut down.`);
  }
}

export async function registerMapServer<C extends MapContext>(
  loader: RegistryLoader<C>
) {
  const [pipeline, preload, replica, store] = await Promise.all([
    loader.get("pipeline"),
    loader.get("preload"),
    loader.get("replica"),
    loader.get("store"),
  ]);
  return new MapServer(pipeline, preload, replica, store);
}
