import type { ClientConfig } from "@/client/game/client_config";
import type { ClientTable } from "@/client/game/game";
import { nearestKEntitiesInFrustum } from "@/client/game/renderers/cull_entities";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { drawLimitValueWithTweak } from "@/client/game/resources/graphics_settings";
import { isRenderNpcEntity } from "@/client/game/resources/npcs";
import type { ClientResources } from "@/client/game/resources/types";
import { NpcMetadataSelector } from "@/shared/ecs/gen/selectors";
import { Cval } from "@/shared/util/cvals";

const numNpcsCval = new Cval({
  path: ["renderer", "npcs", "numNpcs"],
  help: "The total number of NPCs this client renderer is aware of last frame.",
  initialValue: 0,
});

const numNpcsRenderedCval = new Cval({
  path: ["renderer", "npcs", "numRenderedNpcs"],
  help: "The total number of NPCs rendered in the last frame.",
  initialValue: 0,
});

export const makeNpcsRenderer = (
  clientConfig: ClientConfig,
  table: ClientTable,
  resources: ClientResources
): Renderer => {
  let frameNumber = 0;
  return {
    name: "npcs",
    draw(scenes: Scenes, dt: number) {
      const tweaks = resources.get("/tweaks");
      if (!tweaks.showNpcs) {
        return;
      }
      const camera = resources.get("/scene/camera");

      const clock = resources.get("/clock");

      numNpcsCval.value = 0;
      numNpcsRenderedCval.value = 0;

      const becomeNpc = resources.get("/scene/npc/become_npc");
      const skyParams = resources.get("/scene/sky_params");

      const entities = nearestKEntitiesInFrustum(
        camera,
        (q) => table.scan(q),
        NpcMetadataSelector,
        drawLimitValueWithTweak(
          resources,
          tweaks.clientRendering.npcRenderLimit
        ),
        {
          mustKeep:
            becomeNpc.kind === "active"
              ? new Set([becomeNpc.entityId])
              : undefined,
        }
      );
      if (
        becomeNpc.kind === "active" &&
        !entities.find((x) => x.id === becomeNpc.entityId)
      ) {
        // If the player is currently the NPC, always render it since due to
        // client/server position differences, it may not be reported as being
        // in the frustum.
        const entity = table.get(NpcMetadataSelector.point(becomeNpc.entityId));
        if (entity) {
          entities.push(entity);
        }
      }
      for (const entity of entities) {
        if (!isRenderNpcEntity(entity)) {
          continue;
        }

        ++numNpcsCval.value;

        const renderState = resources.cached(
          "/scene/npc/render_state",
          entity.id
        );
        if (!renderState) {
          continue;
        }

        ++numNpcsRenderedCval.value;
        renderState.tick(
          entity,
          dt,
          frameNumber,
          clock.time,
          skyParams,
          tweaks,
          resources
        );
        renderState.addToScene(scenes, clock.time);
      }

      ++frameNumber;
    },
  };
};
