import {
  AssetExportsServerImpl,
  InvalidAssetExportServer,
  LazyAssetExportsServer,
} from "@/galois/interface/asset_server/exports";
import { registerAskApi } from "@/server/ask/api";
import { createCameraClient } from "@/server/camera/api";
import { registerLogicApi } from "@/server/shared/api/logic";
import { registerBakery } from "@/server/shared/bikkie/registry";
import { registerChatApi } from "@/server/shared/chat/register";
import { sharedServerContext } from "@/server/shared/context";
import { numCpus } from "@/server/shared/cpu";
import { registerDiscordBot } from "@/server/shared/discord";
import { registerFirehose } from "@/server/shared/firehose/register";
import { registerIdGenerator } from "@/server/shared/ids/generator";
import { runServer } from "@/server/shared/main";
import { registerServerMods } from "@/server/shared/minigames/server_bootstrap";
import { registerServerTaskProcessor } from "@/server/shared/tasks/server_tasks/server_task_processor";
import { registerTwitchBot } from "@/server/shared/twitch/twitch";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { registerWorldApi } from "@/server/shared/world/register";
import { registerApp } from "@/server/web/app";
import { registerBigQueryClient } from "@/server/web/bigquery";
import { registerWebServerConfig } from "@/server/web/config";
import type { WebServerContext } from "@/server/web/context";
import { registerSessionStore } from "@/server/web/db/sessions";
import { registerCacheClient } from "@/server/web/server_cache";
import { SourceMapCache } from "@/server/web/source_maps";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { RegistryBuilder } from "@/shared/registry";
import { sleep } from "@/shared/util/async";

async function registerAssetServer<C extends WebServerContext>(
  loader: RegistryLoader<C>
) {
  const config = await loader.get("config");

  const createAssetServer = async () => {
    // In production we're running the asset server as its own service
    // so we want to use all the CPUs available to it.
    const workerPoolSize =
      process.env.NODE_ENV === "production"
        ? numCpus()
        : Math.max(1, numCpus() - 1);
    log.info(`Initializing asset server with ${workerPoolSize} workers.`);
    const bakery = await loader.get("bakery");
    return new AssetExportsServerImpl(bakery.binaries, workerPoolSize);
  };

  switch (config.assetServerMode) {
    case "local":
      return createAssetServer();
    case "lazy":
      return new LazyAssetExportsServer(createAssetServer);
    case "none":
    case "proxy":
      return new InvalidAssetExportServer();
  }
}

export async function webServerContext(signal?: AbortSignal) {
  return new RegistryBuilder<WebServerContext>()
    .install(sharedServerContext)
    .bind("app", registerApp)
    .bind("askApi", registerAskApi)
    .bind("assetExportsServer", registerAssetServer)
    .bind("bakery", registerBakery)
    .bind("bigQuery", registerBigQueryClient)
    .bind("cameraClient", async () => createCameraClient())
    .bind("chatApi", registerChatApi)
    .bind("config", registerWebServerConfig)
    .bind("discordBot", registerDiscordBot)
    .bind("firehose", registerFirehose)
    .bind("idGenerator", registerIdGenerator)
    .bind("serverMods", registerServerMods)
    .bind("logicApi", registerLogicApi)
    .bind("serverCache", registerCacheClient)
    .bind("serverTaskProcessor", registerServerTaskProcessor)
    .bind("sessionStore", registerSessionStore)
    .bind("sourceMapCache", async () => new SourceMapCache())
    .bind("twitchBot", registerTwitchBot)
    .bind("worldApi", registerWorldApi({ signal }))
    .bind("voxeloo", loadVoxeloo)
    .build();
}

void runServer("web", webServerContext, async (context) => {
  await context.app.start(context);
  return {
    readyHook: async () => {
      if (CONFIG.disableGame) {
        return true;
      }
      return context.worldApi.healthy();
    },
    shutdownHook: async () => {
      await sleep(CONFIG.webServerLameDuckMs);
      await context.app.stop();
    },
  };
});
