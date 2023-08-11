import { GardenHose } from "@/client/events/api";
import { registerChatIo } from "@/client/game/chat/io";
import { registerMailman } from "@/client/game/chat/mailman";
import type { InitConfigOptions } from "@/client/game/client_config";
import { initializeClientConfig } from "@/client/game/client_config";
import type { ClientContext, EarlyClientContext } from "@/client/game/context";
import {
  registerAsync,
  registerAudioManager,
  registerAuthManager,
  registerBikkie,
  registerClientCache,
  registerClientIo,
  registerClientMods,
  registerEvents,
  registerInitialCvals,
  registerInput,
  registerLoop,
  registerMapManager,
  registerNotificationsManager,
  registerNuxManager,
  registerOobFetcher,
  registerPermissionsManager,
  registerPushManager,
  registerRequestBatchers,
  registerResourcesPipeToGardenHose,
  registerSocialManager,
  registerTelemetry,
  registerTracing,
} from "@/client/game/context_managers/bootstrap";
import type { ClientMetaIndex } from "@/client/game/game";
import {
  registerChangeBuffer,
  registerEarlyTable,
  registerServerTable,
  registerTable,
} from "@/client/game/game";
import { registerMarchHelper } from "@/client/game/helpers/march";
import { registerRendererController } from "@/client/game/renderers/bootstrap";
import {
  registerReactResources,
  registerResourceStats,
  registerResources,
} from "@/client/game/resources/bootstrap";
import type { ClientResources } from "@/client/game/resources/types";
import { registerScriptController } from "@/client/game/scripts/bootstrap";
import { registerRenderScriptController } from "@/client/game/scripts/bootstrap_renderer";
import { loadVoxeloo } from "@/client/game/webasm";
import { registerClientWorker } from "@/client/game/worker/host";
import type { LogCvalsRequest } from "@/pages/api/cval_logging";
import type { MetaIndexTableImpl } from "@/shared/ecs/table";
import { getIndexedResources } from "@/shared/game/ecs_indexed_resources";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { EventLoopLagPoller } from "@/shared/metrics/event_loop_lag_poller";
import { Timer } from "@/shared/metrics/timer";
import type { RegistryLoader } from "@/shared/registry";
import { RegistryBuilder } from "@/shared/registry";
import { fireAndForget } from "@/shared/util/async";
import {
  collectAll,
  defaultCvalDatabase,
  makeCvalHook,
} from "@/shared/util/cvals";
import { jsonPost } from "@/shared/util/fetch_helpers";

declare global {
  /* eslint-disable no-var */
  var ecs: MetaIndexTableImpl<number, ClientMetaIndex> | undefined;
  var resources: ClientResources | undefined;
  var clientContext: ClientContext | undefined;
  /* eslint-enable no-var */
}

async function registerIndexedResources(loader: RegistryLoader<ClientContext>) {
  const table = await loader.get("table");
  return getIndexedResources(table);
}

async function initializeConfigAndVoxeloo(options?: InitConfigOptions) {
  const tryInitConfigAndVoxeloo = async (options?: InitConfigOptions) => {
    const config = await initializeClientConfig(options);
    const voxeloo = await loadVoxeloo(config);
    return { config, voxeloo };
  };

  try {
    return await tryInitConfigAndVoxeloo(options);
  } catch (e) {
    // Memory allocation errors manifest as RangeErrors.
    if (!(e instanceof RangeError)) {
      throw e;
    }
    // Try again in low memory mode (e.g. 32-bit browsers have trouble here).
    return tryInitConfigAndVoxeloo({ ...options, forceLowMemory: true });
  }
}

function logStartupTimes(
  preContextTime: number,
  earlyContextTime: number,
  lateContextTime: number
) {
  log.info(
    `Contexts built, pre-load=${preContextTime}ms, early=${earlyContextTime}ms, late=${lateContextTime}ms`
  );
  makeCvalHook({
    path: ["game", "loadContext", "preContext"],
    help: "The time the user loading pre-context.",
    collect: () => preContextTime,
  });
  makeCvalHook({
    path: ["game", "loadContext", "earlyContext"],
    help: "The time the user spent at early context.",
    collect: () => earlyContextTime,
  });
  makeCvalHook({
    path: ["game", "loadContext", "lateContext"],
    help: "The time the user spent at late context.",
    collect: () => lateContextTime,
  });
}

export async function initializeClient(
  userId: BiomesId,
  configOptions?: InitConfigOptions
): Promise<{
  earlyContextLoader: RegistryLoader<EarlyClientContext>;
  start: () => Promise<ClientContext>;
  stop: () => Promise<void>;
}> {
  const timer = new Timer();
  registerInitialCvals();
  const preContextTime = timer.elapsedAndReset();
  const lagPoller = new EventLoopLagPoller(100, {
    metricName: "game:loop:eventLoopLatencyMs",
  });

  // Voxeloo load permutes client config (e.g. low memory mode)
  const configAndVoxelooPromise = initializeConfigAndVoxeloo(configOptions);
  const earlyContextLoader = new RegistryBuilder<EarlyClientContext>()
    .bind("authManager", registerAuthManager)
    .bind("changeBuffer", registerChangeBuffer)
    .bind("chatIo", registerChatIo)
    .bind("clientCache", registerClientCache)
    .bind("earlyTable", registerEarlyTable)
    .bind("oobFetcher", registerOobFetcher)
    .bind("gardenHose", async () => new GardenHose())
    .bind("io", registerClientIo)
    .bind("marchHelper", registerMarchHelper)
    .bind("pushManager", registerPushManager)
    .bind("serverTable", registerServerTable)
    .bind("tracing", registerTracing)
    .bind("bikkieLoaded", () => registerBikkie(configOptions?.bikkieTrayId))
    .bind("worker", registerClientWorker)
    .bind("voxeloo", async () => {
      const { voxeloo } = await configAndVoxelooPromise;
      return voxeloo;
    })
    .bind("clientConfig", async () => {
      const { config } = await configAndVoxelooPromise;
      return config;
    })
    .set("userId", userId)
    .buildLoader();

  let earlyContext: EarlyClientContext | undefined;
  let context: ClientContext | undefined;
  return {
    earlyContextLoader,
    start: async () => {
      timer.reset();
      earlyContext = await earlyContextLoader.build();
      const earlyContextTime = timer.elapsedAndReset();
      context = await new RegistryBuilder<ClientContext>()
        .bind("async", registerAsync)
        .bind("audioManager", registerAudioManager)
        .bind("events", registerEvents)
        .bind("indexedResources", registerIndexedResources)
        .bind("initialState", () => earlyContext!.io.start())
        .bind("input", registerInput)
        .bind("loop", registerLoop)
        .bind("mailman", registerMailman)
        .bind("clientMods", registerClientMods)
        .bind("mapManager", registerMapManager)
        .bind("notificationsManager", registerNotificationsManager)
        .bind("nuxManager", registerNuxManager)
        .bind("permissionsManager", registerPermissionsManager)
        .bind("reactResources", registerReactResources)
        .bind("rendererController", registerRendererController)
        .bind("rendererScripts", registerRenderScriptController)
        .bind("requestBatchers", registerRequestBatchers)
        .bind("resources", registerResources)
        .bind("resourcesPipeToGardenHose", registerResourcesPipeToGardenHose)
        .bind("resourcesStats", registerResourceStats)
        .bind("scripts", registerScriptController)
        .bind("socialManager", registerSocialManager)
        .bind("table", registerTable)
        .bind("telemetry", registerTelemetry)
        .build(earlyContext);

      // Also for debugging lets expose it.
      global.ecs = context.table;
      global.resources = context.resources;
      global.clientContext = context;

      context.mapManager.start();
      context.loop.start();
      const lateContextTime = timer.elapsedAndReset();

      logStartupTimes(preContextTime, earlyContextTime, lateContextTime);

      fireAndForget(
        jsonPost<void, LogCvalsRequest>("/api/cval_logging", {
          cvals: collectAll(defaultCvalDatabase()),
          source: "startup",
        })
      );

      return context;
    },
    stop: async () => {
      log.warn("Client shutting down");
      if (context) {
        context.loop.stop();
        context.input.detach();
        context.rendererController.detach();
        context.resourcesPipeToGardenHose.stop();
        context.nuxManager.stop();
        context.events.clear();
        context.mapManager.stop();
        context.scripts.clear();
      }
      if (earlyContext) {
        await earlyContext.io.stop("client shutdown");
        earlyContext.changeBuffer.clear();
      }
      if (context) {
        context.resources.clear();
        context.serverTable.clear();
      }
      lagPoller.stop();
    },
  };
}
