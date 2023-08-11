import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { ClientTable } from "@/client/game/game";
import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import { addToScenes, type Scenes } from "@/client/game/renderers/scenes";
import type { DropResource } from "@/client/game/resources/drops";
import type { ClientResources } from "@/client/game/resources/types";
import { updateBlockItemMaterial } from "@/gen/client/game/shaders/block_item";
import type { Vec2 } from "@/shared/math/types";
import * as THREE from "three";

function animateDrop(
  resources: ClientResources,
  drop: DropResource,
  dt: number,
  audioManager: AudioManager
) {
  // Return immediately if the drop is hidden.
  if (!drop.visible) {
    return;
  }

  // Handle position transitions.
  if (drop.acquirer) {
    const playerPosition =
      resources.get("/scene/player", drop.acquirer)?.position ??
      resources.get("/ecs/c/position", drop.acquirer)?.v;
    if (playerPosition) {
      drop.position.target(playerPosition);
      drop.position.tick(dt);
      if (drop.position.done()) {
        drop.visible = false;

        const localPlayer = resources.get("/scene/local_player");
        if (localPlayer.id === drop.acquirer) {
          const entity = resources.get("/ecs/entity", drop.ecsId);
          const itemId = entity?.loose_item?.item.id;
          const assetType =
            itemId && entity?.loose_item?.item.isCurrency
              ? "bling_collect"
              : "drop_collect";
          localPlayer.player.setSound(
            resources,
            audioManager,
            "collect",
            assetType
          );
        }
      } else {
        drop.itemMesh?.three.position.set(...drop.position.get());
      }
    }
  } else if (!drop.position.done()) {
    drop.position.tick(dt);
    drop.itemMesh?.three.position.set(...drop.position.get());
  }

  // Handle scaling transitions.
  if (!drop.scale.done()) {
    drop.scale.tick(dt);
    drop.itemMesh?.three.scale.setScalar(drop.scale.get());
  }

  drop.spatialLighting.tick(dt);

  // Rotation animation.
  drop.itemMesh?.three.rotateOnAxis(new THREE.Vector3(0, 1, 0), dt);
}

function updateDropMaterial(resources: ClientResources, drop: DropResource) {
  const sky = resources.get("/scene/sky_params");
  const spatialLighting = drop.spatialLighting.get().slice(0, 2) as Vec2;
  drop.itemMesh?.three.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof BasePassMaterial
    ) {
      updateBlockItemMaterial(child.material, {
        light: sky.sunDirection.toArray(),
        spatialLighting,
      });
    }
  });
}

export const makeDropsRenderer = (
  table: ClientTable,
  resources: ClientResources,
  audioManager: AudioManager
): Renderer => ({
  name: "drops",
  draw(scenes: Scenes, dt: number) {
    for (const id of table.metaIndex.drop_selector.scanAll()) {
      const drop = resources.cached("/scene/drops", id);
      if (drop && drop.visible && drop.itemMesh) {
        animateDrop(resources, drop, dt, audioManager);
        updateDropMaterial(resources, drop);
        addToScenes(scenes, drop.itemMesh.three);
      }
    }
  },
});
