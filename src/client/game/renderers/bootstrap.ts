import type { ClientContext } from "@/client/game/context";
import { buildRendererController } from "@/client/game/renderers/renderer_controller";
import { buildRenderers } from "@/client/game/renderers/renderers";
import type { RegistryLoader } from "@/shared/registry";

export async function registerRendererController(
  loader: RegistryLoader<ClientContext>
) {
  const base = await buildRendererController(
    loader,
    await buildRenderers(loader)
  );
  if (module.hot) {
    module.hot.accept("@/client/game/renderers/renderers", () => {
      void import("@/client/game/renderers/renderers")
        .then((m) => m.buildRenderers(loader))
        .then((newRenderers) => {
          base.setRenderers(newRenderers);
        });
    });
    return base;
  }

  return base;
}
