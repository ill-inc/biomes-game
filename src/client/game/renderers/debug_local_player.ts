import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import {
  canAttackFilter,
  entitiesInAttackRegion,
} from "@/client/game/resources/melee_attack_region";
import type { ClientResources } from "@/client/game/resources/types";
import { makeBasicTranslucentMaterial } from "@/gen/client/game/shaders/basic_translucent";
import * as THREE from "three";

export class DebugLocalPlayerRenderer implements Renderer {
  name = "debugLocalPlayer";

  private emptyMaterial = makeBasicTranslucentMaterial({
    baseColor: [0, 1, 0, 0.5],
  });
  private canAttackMaterial = makeBasicTranslucentMaterial({
    baseColor: [1, 0, 0, 0.5],
  });
  private entitiesCantAttackMaterial = makeBasicTranslucentMaterial({
    baseColor: [1, 1, 0, 0.5],
  });

  constructor(
    private readonly table: ClientTable,
    private readonly resources: ClientResources,
    private readonly permissionsManager: PermissionsManager
  ) {}

  drawMeleeAttackRegion(scenes: Scenes) {
    const tweaks = this.resources.get("/tweaks");
    if (!tweaks.showPlayerMeleeAttackRegion) {
      return;
    }

    const player = this.resources.get("/scene/local_player");

    const meleeAttackRegion = this.resources.get(
      "/player/melee_attack_region",
      player.id
    );

    let material: THREE.RawShaderMaterial;
    const entities = entitiesInAttackRegion(
      this.table,
      meleeAttackRegion,
      (x) => x.id !== player.id
    );
    const aclAllowsPlayers = this.permissionsManager.clientActionAllowedAt(
      "pvp",
      meleeAttackRegion.boundingSphere.center
    );
    const ruleSet = this.resources.get("/ruleset/current");
    const me = this.resources.get("/ecs/entity", player.id);
    if (entities.length > 0) {
      if (
        entities.filter((e) =>
          canAttackFilter(ruleSet, aclAllowsPlayers, me, e)
        ).length > 0
      ) {
        material = this.canAttackMaterial;
      } else {
        material = this.entitiesCantAttackMaterial;
      }
    } else {
      material = this.emptyMaterial;
    }

    const boxTransform = new THREE.Matrix4()
      .fromArray(meleeAttackRegion.frustum)
      .invert();
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    boxGeometry.applyMatrix4(boxTransform);
    addToScenes(scenes, new THREE.Mesh(boxGeometry, material));
  }

  draw(scenes: Scenes, _dt: number) {
    this.drawMeleeAttackRegion(scenes);
  }
}
