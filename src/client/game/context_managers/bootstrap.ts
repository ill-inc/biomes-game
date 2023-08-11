import type { ClientContext, EarlyClientContext } from "@/client/game/context";
import { loadAudioManager } from "@/client/game/context_managers/audio_manager";
import { loadAuthManager } from "@/client/game/context_managers/auth_manager";
import { loadAsync } from "@/client/game/context_managers/biomes_async";
import { loadClientCache } from "@/client/game/context_managers/client_cache";
import { loadClientIo } from "@/client/game/context_managers/client_io";
import { loadEvents } from "@/client/game/context_managers/events";
import { loadResourcesPipeToGardenHose } from "@/client/game/context_managers/garden_hose";
import { loadInput } from "@/client/game/context_managers/input";
import { loadLoop } from "@/client/game/context_managers/loop";
import { loadMapManager } from "@/client/game/context_managers/map_manager";
import { loadNotificationsManager } from "@/client/game/context_managers/notifications_manager";
import { loadNuxManager } from "@/client/game/context_managers/nux_manager";
import { loadOobFetcher } from "@/client/game/context_managers/oob_fetcher";
import { loadPermissionsManager } from "@/client/game/context_managers/permissions_manager";
import { loadPushManager } from "@/client/game/context_managers/push_manager";
import { loadRequestBatchers } from "@/client/game/context_managers/request_batchers";
import { loadSocialManager } from "@/client/game/context_managers/social_manager";
import { loadTelemetry } from "@/client/game/context_managers/telemetry";
import { loadTracing } from "@/client/game/context_managers/wasm_memory_tracing";
import { initializeBikkie } from "@/client/game/util/bikkie";
import { clientContextHotAccept } from "@/client/game/util/hot_reload_module_helpers";
import {
  cleanupRetargetableProxy,
  hotHandoffRetargetableProxy,
  retargetableProxy,
} from "@/client/game/util/retargetable_proxy";
import { loadClientMods } from "@/server/shared/minigames/client_bootstrap";
import { initializeSystemCvals } from "@/server/shared/system_cvals";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import type { RegistryLoader } from "@/shared/registry";
import { ok } from "assert";

export async function registerClientIo(
  loader: RegistryLoader<EarlyClientContext>
) {
  const base = await loadClientIo(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/client_io",
      clientContextHotAccept(async () => {
        const { loadClientIo } = await import(
          "@/client/game/context_managers/client_io"
        );
        return loadClientIo(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerClientCache(
  loader: RegistryLoader<EarlyClientContext>
) {
  const base = await loadClientCache(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/client_cache",
      clientContextHotAccept(async () => {
        const { loadClientCache } = await import(
          "@/client/game/context_managers/client_cache"
        );
        return loadClientCache(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerSocialManager(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadSocialManager(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/social_manager",
      clientContextHotAccept(async () => {
        const { loadSocialManager } = await import(
          "@/client/game/context_managers/social_manager"
        );
        return loadSocialManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerAudioManager(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadAudioManager(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/audio_manager",
      clientContextHotAccept(async () => {
        const { loadAudioManager } = await import(
          "@/client/game/context_managers/audio_manager"
        );
        return loadAudioManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerMapManager(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadMapManager(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/map_manager",
      clientContextHotAccept(async () => {
        const { loadMapManager } = await import(
          "@/client/game/context_managers/map_manager"
        );
        return loadMapManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerNotificationsManager(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadNotificationsManager(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/notifications_manager",
      clientContextHotAccept(async () => {
        const { loadNotificationsManager } = await import(
          "@/client/game/context_managers/notifications_manager"
        );
        return loadNotificationsManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerNuxManager(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadNuxManager(loader);
  if (module.hot) {
    const [ret, setNew] = cleanupRetargetableProxy(base, "stop");
    module.hot.accept(
      "@/client/game/context_managers/nux_manager",
      clientContextHotAccept(async () => {
        const { loadNuxManager } = await import(
          "@/client/game/context_managers/nux_manager"
        );
        return loadNuxManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerPermissionsManager(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadPermissionsManager(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/permissions_manager",
      clientContextHotAccept(async () => {
        const { loadPermissionsManager } = await import(
          "@/client/game/context_managers/permissions_manager"
        );
        return loadPermissionsManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerPushManager(
  loader: RegistryLoader<EarlyClientContext>
) {
  const base = await loadPushManager(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/push_manager",
      clientContextHotAccept(async () => {
        const { loadPushManager } = await import(
          "@/client/game/context_managers/push_manager"
        );
        return loadPushManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerAuthManager(
  loader: RegistryLoader<EarlyClientContext>
) {
  const base = await loadAuthManager(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/auth_manager",
      clientContextHotAccept(async () => {
        const { loadAuthManager } = await import(
          "@/client/game/context_managers/auth_manager"
        );
        return loadAuthManager(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerResourcesPipeToGardenHose(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadResourcesPipeToGardenHose(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/garden_hose",
      clientContextHotAccept(async () => {
        const { loadResourcesPipeToGardenHose } = await import(
          "@/client/game/context_managers/garden_hose"
        );
        return loadResourcesPipeToGardenHose(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerInput(loader: RegistryLoader<ClientContext>) {
  const base = await loadInput(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/input",
      clientContextHotAccept(async () => {
        const { loadInput } = await import(
          "@/client/game/context_managers/input"
        );
        return loadInput(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerLoop(loader: RegistryLoader<ClientContext>) {
  const base = await loadLoop(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/loop",
      clientContextHotAccept(async () => {
        const { loadLoop } = await import(
          "@/client/game/context_managers/loop"
        );
        return loadLoop(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerAsync(loader: RegistryLoader<ClientContext>) {
  const base = await loadAsync(loader);
  if (module.hot) {
    const [ret, setNew] = hotHandoffRetargetableProxy(base, "hotHandoff");
    module.hot.accept(
      "@/client/game/context_managers/biomes_async",
      clientContextHotAccept(async () => {
        const { loadAsync } = await import(
          "@/client/game/context_managers/biomes_async"
        );
        return loadAsync(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerEvents(loader: RegistryLoader<ClientContext>) {
  const base = await loadEvents(loader);
  if (module.hot) {
    const [ret, setNew] = cleanupRetargetableProxy(base, "clear");
    module.hot.accept(
      "@/client/game/context_managers/events",
      clientContextHotAccept(async () => {
        const { loadEvents } = await import(
          "@/client/game/context_managers/events"
        );
        return loadEvents(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerTelemetry(loader: RegistryLoader<ClientContext>) {
  const base = await loadTelemetry(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/telemetry",
      clientContextHotAccept(async () => {
        const { loadTelemetry } = await import(
          "@/client/game/context_managers/telemetry"
        );
        return loadTelemetry(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerTracing(
  loader: RegistryLoader<EarlyClientContext>
) {
  const base = await loadTracing(loader);
  if (module.hot && base) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/wasm_memory_tracing",
      clientContextHotAccept(async () => {
        const { loadTracing } = await import(
          "@/client/game/context_managers/wasm_memory_tracing"
        );
        return (await loadTracing(loader))!;
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerOobFetcher(
  loader: RegistryLoader<EarlyClientContext>
) {
  const base = await loadOobFetcher(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/oob_fetcher",
      clientContextHotAccept(async () => {
        const { loadOobFetcher } = await import(
          "@/client/game/context_managers/oob_fetcher"
        );
        return loadOobFetcher(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerClientMods(
  _loader: RegistryLoader<ClientContext>
) {
  const base = await loadClientMods();
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/server/shared/minigames/client_bootstrap",
      clientContextHotAccept(async () => {
        const { loadClientMods } = await import(
          "@/server/shared/minigames/client_bootstrap"
        );

        return loadClientMods();
      }, setNew)
    );

    return ret;
  }

  return base;
}

export async function registerRequestBatchers(
  loader: RegistryLoader<ClientContext>
) {
  const base = await loadRequestBatchers(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/context_managers/request_batchers",
      clientContextHotAccept(async () => {
        const { loadRequestBatchers } = await import(
          "@/client/game/context_managers/request_batchers"
        );

        return loadRequestBatchers(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}

export function registerInitialCvals() {
  const ret = initializeSystemCvals();
  if (module.hot) {
    module.hot.accept("@/server/shared/system_cvals");
  }
  return ret;
}

export async function registerBikkie(expectedTrayId?: BiomesId) {
  const timer = new Timer();
  const ret = await initializeBikkie(expectedTrayId);
  ok(ret, "Bikkie failed to load");
  log.info(`Initial bikkie load in ${timer.elapsed}ms`);
  if (module.hot) {
    module.hot.accept("@/client/game/util/bikkie");
  }
  return ret;
}
