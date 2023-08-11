import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";

export const makeParticlesRenderer = (
  resources: ClientResources
): Renderer => ({
  name: "particles",
  draw: (scenes: Scenes, _dt: number) => {
    const systems = resources.get("/scene/particles");
    const clock = resources.get("/clock");
    const skyParams = resources.get("/scene/sky_params");
    for (const system of systems.values()) {
      system.tickToTime(clock.time, skyParams.sunDirection.toArray());
      if (system.ready() && !system.allAnimationsComplete()) {
        addToScenes(scenes, system.three);
      }
    }
  },
});
