import type { ClientContext } from "@/client/game/context";
import { buildRenderScriptController } from "@/client/game/scripts/init_renderer";
import { clientContextHotAccept } from "@/client/game/util/hot_reload_module_helpers";
import { retargetableProxy } from "@/client/game/util/retargetable_proxy";
import type { RegistryLoader } from "@/shared/registry";

export async function registerRenderScriptController(
  loader: RegistryLoader<ClientContext>
) {
  const base = await buildRenderScriptController(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/scripts/init_renderer",
      clientContextHotAccept(async () => {
        const { buildRenderScriptController } = await import(
          "@/client/game/scripts/init_renderer"
        );
        return buildRenderScriptController(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}
