import type { ClientTable } from "@/client/game/game";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";
import { makeBasicTranslucentMaterial } from "@/gen/client/game/shaders/basic_translucent";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { PositionSelector } from "@/shared/ecs/gen/selectors";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import { centerAABB, sizeAABB } from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import * as THREE from "three";

export class DebugAabbRenderer implements Renderer {
  name = "debugAabb";

  private aabbMaterial = makeBasicTranslucentMaterial({
    baseColor: [1, 0, 0, 0.5],
  });
  private aabbGeometry = new THREE.BoxGeometry(1, 1, 1);

  constructor(
    private readonly table: ClientTable,
    private readonly resources: ClientResources
  ) {}

  draw(scenes: Scenes, _dt: number) {
    const tweaks = this.resources.get("/tweaks");
    if (!tweaks.showPlayerAABB) {
      return;
    }

    const boxesAndPositions = collectVisibleBoxesAndPositions(
      this.table,
      this.resources
    );

    for (const { box } of boxesAndPositions) {
      const boxMesh = new THREE.Mesh(this.aabbGeometry, this.aabbMaterial);
      boxMesh.scale.fromArray(sizeAABB(box));
      boxMesh.position.fromArray(centerAABB(box));
      addToScenes(scenes, boxMesh);
    }
  }
}

function collectVisibleBoxesAndPositions(
  table: ClientTable,
  resources: ClientResources
) {
  const boxes: { box: AABB; position: Vec3 }[] = [];
  const pushBox = (e: ReadonlyEntity) => {
    const maybeBox = getAabbForEntity(e);
    const maybePosition = e.position?.v;
    if (maybeBox && maybePosition) {
      boxes.push({
        box: maybeBox,
        position: [...maybePosition],
      });
    }
  };

  const camera = resources.get("/scene/camera");

  for (const entity of table.scan(
    PositionSelector.query.spatial.inSphere(camera.frustumBoundingSphere, {
      approx: true,
    })
  )) {
    // Ignore player entities, they are handled separately
    if (entity.remote_connection) {
      const player = resources.get("/sim/player", entity.id);
      if (!player) {
        continue;
      }
      boxes.push({ box: player.aabb(), position: player.position });
    } else {
      pushBox(entity);
    }
  }

  const group = resources.get("/groups/placement/preview");
  if (group.active()) {
    /*
    // Show global AABB
    const box = group.placementTensorTakeOwnership().box as AABB;
    const boxGeometry = new THREE.BoxGeometry(...sizeAABB(box));
    const center = centerAABB(box);
    boxGeometry.translate(center[0], center[1], center[2]);
    boxes.push({ box, position: group.position });
    */

    /*
    // AABBs corresponding to placement tensor
    const placement = group.placementTensorTakeOwnership();
    const groupPlacementBoxList = voxeloo.toGroupBoxList(
      group.groupsIndex!,
      placement.tensor,
      group.position
    );
    const groupPlacementBoxDict = groupPlacementBoxList.toDict();

    groupPlacementBoxDict?.scan((a) => {
      boxes.push({
        box: a,
        position: group.position,
      });
    });
    */

    // Show transformed multi aabbs
    group.groupPlacementBoxDict?.scan((a) => {
      boxes.push({
        box: group.transformAABB(a),
        position: group.position,
      });
    });
  }

  return boxes;
}
