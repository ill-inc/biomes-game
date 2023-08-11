import type { ClientTable } from "@/client/game/game";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";
import { updateDestructionMaterial } from "@/gen/client/game/shaders/destruction";
import {
  EnvironmentGroupSelector,
  GroupPreviewSelector,
} from "@/shared/ecs/gen/selectors";
import type { BiomesId } from "@/shared/ids";
import { clamp } from "@/shared/math/math";
import * as THREE from "three";

export class GroupsRenderer implements Renderer {
  name = "groups";

  constructor(
    private readonly userId: BiomesId,
    private readonly table: ClientTable,
    private readonly resources: ClientResources
  ) {}

  private drawGroupOrBlueprintDestruction(scenes: Scenes) {
    // Render group destruction.
    const destroyingMaterial = this.resources.cached(
      "/materials/destroying_material"
    );
    const player = this.resources.get("/scene/local_player");
    if (
      (player.destroyInfo?.groupId || player.destroyInfo?.blueprintId) &&
      destroyingMaterial
    ) {
      let completion = player.destroyInfo.percentage ?? 0;
      if (player.destroyInfo.finished) {
        if (player.destroyInfo.activeAction.action === "destroy") {
          completion = 1.0;
        } else {
          completion = 0.0;
        }
      }
      const mesh = player.destroyInfo?.groupId
        ? this.resources.cached(
            "/groups/destruction_mesh",
            player.destroyInfo.groupId
          )
        : this.resources.cached(
            "/groups/blueprint/destruction_mesh",
            player.destroyInfo.blueprintId!
          );
      if (mesh) {
        const frames = destroyingMaterial.numFrames;
        const frame =
          completion > 0
            ? clamp(Math.floor((1 + frames) * completion) - 1, 0, frames)
            : -1;
        mesh.three.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.RawShaderMaterial
          ) {
            updateDestructionMaterial(child.material, {
              destroyTextureFrame: frame,
            });
          }
        });

        addToScenes(scenes, mesh.three);
      }
    }
  }

  private drawWandHighlight(scenes: Scenes) {
    // Render magic wand highlight mesh.
    const selection = this.resources.get("/hotbar/selection");
    const action = selection.item?.action;
    if (action === "wand") {
      const src = this.resources.get("/groups/src");
      if (src && src.pos) {
        const mesh = this.resources.cached("/groups/src/highlight_mesh");
        if (mesh) {
          addToScenes(scenes, mesh.three);
        }
      }
    }
  }

  private drawGroupHighlights(scenes: Scenes, dt: number) {
    this.resources.update("/groups/highlighted_groups", (groupHighlights) => {
      groupHighlights.forEach((highlightState, groupId) => {
        const mesh = this.resources.cached("/groups/highlight_mesh", groupId);
        if (mesh) {
          mesh.three.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material.opacity = highlightState.opacity;
            }
          });
          addToScenes(scenes, mesh.three);
        }

        const GROUP_HIGHLIGHT_EXPIRATION_MS = 15 * 1000;
        if (
          Date.now() >=
          highlightState.createdAtMs + GROUP_HIGHLIGHT_EXPIRATION_MS
        ) {
          groupHighlights.delete(groupId);
          return;
        }

        // animate group
        if (highlightState.animated) {
          highlightState.opacity -= 0.05 * (60 * dt);
          if (highlightState.opacity <= 0) {
            groupHighlights.delete(groupId);
          }
        }
      });
    });
  }

  private drawGroupBoxes(scenes: Scenes) {
    // Render group boxes.
    const tweaks = this.resources.get("/tweaks");
    if (tweaks.showGroupBoxes) {
      for (const id of this.table.scanIds(
        EnvironmentGroupSelector.query.all()
      )) {
        const groupBoxesMesh = this.resources.cached("/groups/boxes_mesh", id);
        if (groupBoxesMesh) {
          addToScenes(scenes, groupBoxesMesh);
        }
      }
    }
  }

  private drawSharedGroupPreviews(scenes: Scenes) {
    // Render group preview mesh.
    for (const groupPreview of this.table.scan(
      GroupPreviewSelector.query.all()
    )) {
      if (groupPreview.group_preview_component.owner_id === this.userId) {
        continue;
      }

      const mesh = this.resources.cached(
        "/groups/preview/mesh",
        groupPreview.id
      );
      if (!mesh) {
        continue;
      }
      mesh.three.position.set(...mesh.box.v0);
      addToScenes(scenes, mesh.three);
    }
  }

  private drawLocalGroupPlacement(scenes: Scenes) {
    const group = this.resources.get("/groups/placement/preview");
    if (!group.active()) {
      return;
    }

    const mesh = group.canActualize
      ? this.resources.cached("/groups/placement/mesh")
      : this.resources.cached("/groups/placement/error_mesh");

    if (!mesh?.three) {
      return;
    }

    mesh.three.position.set(...group.position);
    mesh.three.rotation.y = group.orientation[1];
    // Reflect if needed.
    mesh.three.scale.x = group.reflection[0] === 0 ? 1 : -1;
    mesh.three.scale.y = group.reflection[1] === 0 ? 1 : -1;
    mesh.three.scale.z = group.reflection[2] === 0 ? 1 : -1;

    addToScenes(scenes, mesh.three);
  }

  draw(scenes: Scenes, dt: number) {
    this.drawGroupOrBlueprintDestruction(scenes);
    this.drawWandHighlight(scenes);
    this.drawGroupHighlights(scenes, dt);
    this.drawGroupBoxes(scenes);
    this.drawSharedGroupPreviews(scenes);
    this.drawLocalGroupPlacement(scenes);
  }
}
