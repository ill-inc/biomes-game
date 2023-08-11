import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";

export const makeForbiddenEditsRenderer = (
  resources: ClientResources
): Renderer => ({
  name: "forbiddenEdits",
  draw: (scenes: Scenes) => {
    const edits = resources.get("/scene/forbidden_edits");
    edits.edits.forEach((edit) => {
      addToScenes(scenes, edit.three);
    });
  },
});
