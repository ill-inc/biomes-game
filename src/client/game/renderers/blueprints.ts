import type { ClientTable } from "@/client/game/game";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";
import { BlueprintSelector } from "@/shared/ecs/gen/selectors";

export class BlueprintsRenderer implements Renderer {
  name = "blueprints";

  constructor(
    private readonly table: ClientTable,
    private readonly resources: ClientResources
  ) {}

  draw(scenes: Scenes, _dt: number) {
    for (const entity of this.table.scan(BlueprintSelector.query.all())) {
      const meshData = this.resources.cached(
        "/groups/blueprint/mesh",
        entity.id
      );
      if (!meshData) {
        continue;
      }
      const { hit } = this.resources.get("/scene/cursor");
      const { mesh, updateRequired } = meshData;
      updateRequired(
        hit?.kind === "blueprint" && hit.terrainId !== undefined
          ? hit.pos
          : undefined
      );
      if (mesh.particleSystem) {
        const clock = this.resources.get("/clock");
        mesh.particleSystem.tickToTime(clock.time, [0, 1, 0]);
      }
      mesh.three.position.set(...mesh.box.v0);
      addToScenes(scenes, mesh.three);
    }
  }
}
