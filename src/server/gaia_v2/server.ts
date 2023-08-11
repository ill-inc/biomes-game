import type { GaiaServerContext } from "@/server/gaia_v2/context";
import type { Pipeline } from "@/server/gaia_v2/pipeline";
import type { Sharder } from "@/server/gaia_v2/sharder";
import type { GaiaPubSub } from "@/server/gaia_v2/util/pubsub";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";

export class GaiaServer {
  constructor(
    private readonly pipeline: Pipeline,
    private readonly sharder: Sharder,
    private readonly pubsub: GaiaPubSub
  ) {}

  async start() {
    await this.pipeline.start();
    await this.sharder.start();
    log.info(`Gaia server is running!`);
  }

  async stop() {
    const unfinished = this.pipeline.pending();
    await this.sharder.stop();
    // Give some time for other servers to take the shards we had.
    await sleep(CONFIG.gaiaV2ShutdownDelayMs);
    await this.pubsub.publish(unfinished);
    await this.pipeline.stop();
    log.info("Gaia server is stopped!");
  }
}

export async function registerGaiaServer<C extends GaiaServerContext>(
  loader: RegistryLoader<C>
) {
  const [pipeline, sharder, pubsub] = await Promise.all([
    loader.get("pipeline"),
    loader.get("sharder"),
    loader.get("pubsub"),
  ]);
  return new GaiaServer(pipeline, sharder, pubsub);
}
