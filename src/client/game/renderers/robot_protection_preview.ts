import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";

export class RobotProtectionPreviewRenderer implements Renderer {
  name = "robotProtectionPreview";

  constructor(private readonly resources: ClientResources) {}

  draw(scenes: Scenes, _dt: number) {
    const mesh = this.resources.get("/robots/protection_preview_mesh");
    if (mesh) {
      addToScenes(scenes, mesh);
    }
  }
}
