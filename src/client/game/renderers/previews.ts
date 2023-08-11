import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { EditPreview } from "@/client/game/resources/previews";
import type { ClientResources } from "@/client/game/resources/types";
import { compact } from "lodash";

export const makePreviewRenderer = (resources: ClientResources): Renderer => ({
  name: "preview",
  draw: (scenes: Scenes) => {
    const previews: EditPreview[] = compact([
      resources.get("/scene/preview/del"),
      resources.get("/scene/preview/add"),
      resources.get("/scene/preview/shape"),
      resources.get("/scene/preview/till"),
      resources.get("/scene/preview/dye"),
      resources.get("/scene/preview/water_plant"),
      resources.get("/scene/preview/plant"),
      resources.get("/scene/preview/space_clipboard"),
    ]);
    for (const preview of previews) {
      addToScenes(scenes, preview.mesh);
    }
  },
});
