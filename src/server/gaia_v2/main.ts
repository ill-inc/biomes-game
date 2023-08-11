import type { GaiaConfig, GaiaServerContext } from "@/server/gaia_v2/context";
import { registerGaiaPipeline } from "@/server/gaia_v2/pipeline";
import { registerGaiaServer } from "@/server/gaia_v2/server";
import { registerGaiaSharder } from "@/server/gaia_v2/sharder";
import { registerSimulations } from "@/server/gaia_v2/simulations";
import { zSimulationName } from "@/server/gaia_v2/simulations/api";
import { registerGaiaReplica } from "@/server/gaia_v2/table";
import { registerTerrainEmitter } from "@/server/gaia_v2/terrain/emitter";
import { registerTerrainSync } from "@/server/gaia_v2/terrain/sync";
import { registerClock } from "@/server/gaia_v2/util/clock";
import { registerGaiaPubSub } from "@/server/gaia_v2/util/pubsub";
import { parseArgs, stringLiteralCtor } from "@/server/shared/args";
import { Cleanup } from "@/server/shared/cleanup";
import { sharedServerContext } from "@/server/shared/context";
import { runServer } from "@/server/shared/main";
import { baseServerArgumentConfig } from "@/server/shared/server_config";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { registerWorldApi } from "@/server/shared/world/register";
import type { RegistryLoader } from "@/shared/registry";
import { RegistryBuilder } from "@/shared/registry";
import { registerIdGenerator } from "@/server/shared/ids/generator";

export async function registerGaiaConfig(): Promise<GaiaConfig> {
  return parseArgs<GaiaConfig>({
    ...baseServerArgumentConfig,
    simulations: {
      type: stringLiteralCtor(...zSimulationName.options),
      multiple: true,
      defaultValue: zSimulationName.options,
    },
  });
}

async function registerTerrainMap<C extends GaiaServerContext>(
  loader: RegistryLoader<C>
) {
  const [voxeloo, cleanup] = await Promise.all([
    loader.get("voxeloo"),
    loader.get("cleanup"),
  ]);
  const terrainMap = new voxeloo.GaiaTerrainMapV2();
  cleanup.add(() => terrainMap.delete());
  return terrainMap;
}

void runServer(
  "gaia_v2",
  (signal) =>
    new RegistryBuilder<GaiaServerContext>()
      .install(sharedServerContext)
      .bind("cleanup", async () => new Cleanup())
      .bind("clock", registerClock)
      .bind("config", registerGaiaConfig)
      .bind("idGenerator", registerIdGenerator)
      .bind("pipeline", registerGaiaPipeline)
      .bind("pubsub", registerGaiaPubSub)
      .bind("replica", registerGaiaReplica)
      .bind("server", registerGaiaServer)
      .bind("sharder", registerGaiaSharder)
      .bind("simulations", registerSimulations)
      .bind("terrainEmitter", registerTerrainEmitter)
      .bind("terrainMap", registerTerrainMap)
      .bind("terrainSync", registerTerrainSync)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    await context.server.start();
    return {
      shutdownHook: async () => context.server.stop(),
    };
  }
);
