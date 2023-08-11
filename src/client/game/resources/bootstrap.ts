import type { ClientContext } from "@/client/game/context";
import { hotResourceEmitter } from "@/client/game/resources/hot";
import { resourcesBuilder } from "@/client/game/resources/init";
import type { ClientResourcePaths } from "@/client/game/resources/types";
import { clientContextHotAccept } from "@/client/game/util/hot_reload_module_helpers";
import { retargetableProxy } from "@/client/game/util/retargetable_proxy";
import { ReactResources } from "@/client/resources/react";
import type { RegistryLoader } from "@/shared/registry";
import { ResourcesStats } from "@/shared/resources/biomes";

export async function registerResources(loader: RegistryLoader<ClientContext>) {
  const base = (await resourcesBuilder(loader)).build();
  if (module.hot) {
    const [ret, setNewInternal] = retargetableProxy(base);
    const baseVersion = [0];
    const setNew = (newVal: typeof base) => {
      ret.clear();
      setNewInternal(newVal);
      hotResourceEmitter.emit("onHotResourceReload");
    };
    module.hot.accept(
      "@/client/game/resources/init",
      clientContextHotAccept(async () => {
        baseVersion[0] += 1_000_000;
        const builder = (await import("@/client/game/resources/init"))
          .resourcesBuilder;
        return (await builder(loader)).setBaseVersion(baseVersion[0]).build();
      }, setNew)
    );
    return ret;
  }

  return base;
}

export async function registerReactResources(
  loader: RegistryLoader<ClientContext>
) {
  return new ReactResources<ClientResourcePaths>(await loader.get("resources"));
}

export function registerResourceStats(_loader: RegistryLoader<ClientContext>) {
  return Promise.resolve(new ResourcesStats<ClientResourcePaths>());
}
