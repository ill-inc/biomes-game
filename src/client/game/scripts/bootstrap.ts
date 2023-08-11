import type { ClientContext } from "@/client/game/context";
import { buildScriptController } from "@/client/game/scripts/init";
import { clientContextHotAccept } from "@/client/game/util/hot_reload_module_helpers";
import { retargetableProxy } from "@/client/game/util/retargetable_proxy";
import type { RegistryLoader } from "@/shared/registry";
export async function registerScriptController(
  loader: RegistryLoader<ClientContext>
) {
  const base = await buildScriptController(loader);
  if (module.hot) {
    const [ret, setNew] = retargetableProxy(base);
    module.hot.accept(
      "@/client/game/scripts/init",
      clientContextHotAccept(async () => {
        const { buildScriptController } = await import(
          "@/client/game/scripts/init"
        );
        return buildScriptController(loader);
      }, setNew)
    );
    return ret;
  }

  return base;
}
