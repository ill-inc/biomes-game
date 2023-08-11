import { getClientRenderPosition } from "@/client/components/map/helpers";
import { MapManager } from "@/client/game/context_managers/map_manager";
import { navigationAidHasBeam } from "@/client/game/helpers/navigation_aids";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";
import { updateNoclipBasicTranslucentMaterial } from "@/gen/client/game/shaders/noclip_basic_translucent";
import { dist2, xzProject } from "@/shared/math/linear";
import * as THREE from "three";

export const makeBeamRenderer = (
  mapManager: MapManager,
  resources: ClientResources
): Renderer => ({
  name: "beam",
  draw(scenes: Scenes, _dt: number) {
    const clock = resources.get("/clock");
    const transientBeams = resources.get("/scene/beams/transient");
    const localPlayer = resources.get("/scene/local_player");
    const animLength = 0.1;
    for (const [_, v] of transientBeams.beams) {
      if (v.expiresAt < clock.time) {
        continue;
      }

      const s = (clock.time - v.placedAt) / (v.expiresAt - v.placedAt);
      let height;
      if (s <= animLength) {
        height = (s / animLength) * v.maxHeight;
      } else if (s >= 1 - animLength) {
        height = ((1 - s) / animLength) * v.maxHeight;
      } else {
        height = v.maxHeight;
      }
      v.three.scale.set(1, height, 1);
      v.three.position.set(v.pos[0], v.pos[1] + height / 2, v.pos[2]);

      addToScenes(scenes, v.three);
    }

    for (const playerId of mapManager.trackingPlayerIds) {
      const beamMesh = resources.get("/scene/beams/player_mesh", playerId);
      const playerPos = getClientRenderPosition(resources, playerId);
      if (beamMesh) {
        beamMesh.position.set(playerPos[0], 0, playerPos[2]);
        addToScenes(scenes, beamMesh);
      }
    }

    const localPlayer2d = [
      localPlayer.player.position[0],
      localPlayer.player.position[2],
    ] as const;
    for (const [id, data] of mapManager.localNavigationAids) {
      if (
        !navigationAidHasBeam(data) ||
        dist2(xzProject(data.pos), localPlayer2d) < MapManager.MIN_BEAM_DISTANCE
      ) {
        continue;
      }

      const beamMesh = resources.get(
        "/scene/beams/navigation_mesh",
        id,
        data.kind
      );
      if (beamMesh) {
        beamMesh.position.set(...data.pos);
        beamMesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            updateNoclipBasicTranslucentMaterial(child.material, {});
          }
        });
        addToScenes(scenes, beamMesh);
      }
    }
  },
});
