import {
  isNonCollidingTerrainAtPosition,
  terrainAtPosition,
} from "@/client/game/helpers/blueprint";
import {
  AttackDestroyInteractionError,
  AttackDestroyInteractionErrorMessage,
} from "@/client/game/interact/errors";
import {
  changeRadius,
  handlePlaceVoxelInteraction,
} from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { isTerrainName } from "@/shared/asset_defs/terrain";
import type { Vec3f } from "@/shared/ecs/gen/types";
import type { Hit, TerrainHit } from "@/shared/game/spatial";
import { setPosition } from "@/shared/game/spatial";
import {
  aabbFace,
  add,
  dist,
  floor,
  intersectRayAabbFace,
  normalizev2,
  scale,
  xzProject,
} from "@/shared/math/linear";
import { Dir } from "@/shared/wasm/types/common";

// Maximum distance from which you can perform a floating placement.
const MAX_FLOATING_HIT_DISTANCE = 8.0;

export class TerrainSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "gardenHose"
      | "userId"
      | "table"
      | "audioManager"
    >
  ) {}

  onUnselected() {
    this.deps.resources.set("/scene/preview/add_spec", {
      kind: "empty",
    });
    return false;
  }

  onTick(itemInfo: ClickableItemInfo) {
    const placement = this.getPlacement(itemInfo);

    if (!placement) {
      this.deps.resources.set("/scene/preview/add_spec", {
        kind: "empty",
      });
      return false;
    }

    this.deps.resources.set("/scene/preview/add_spec", {
      kind: placement.isReplacement ? "replace" : "add",
      position: placement.basePosition,
      face: placement.face,
    });

    return true;
  }

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    if (!itemInfo.item) {
      return false;
    }

    const placement = this.getPlacement(itemInfo, true);
    if (!placement) {
      return false;
    }

    const terrainName = itemInfo.item.terrainName;

    if (!isTerrainName(terrainName)) {
      throw new AttackDestroyInteractionErrorMessage(
        `${itemInfo.item.displayName} can not be placed`
      );
    }

    if (
      handlePlaceVoxelInteraction(
        this.deps,
        placement.pos,
        placement.face,
        terrainName,
        itemInfo.itemRef,
        placement.isReplacement
      )
    ) {
      return true;
    }

    return false;
  }

  private isValidCursorHit(cursorHit: Hit | undefined): boolean {
    return (
      cursorHit !== undefined &&
      cursorHit?.distance < changeRadius(this.deps.resources)
    );
  }

  protected getPlacement(itemInfo: ClickableItemInfo, onAction = false) {
    if (!itemInfo.item) {
      return undefined;
    }
    const cursor = this.deps.resources.get("/scene/cursor");
    const floatingHit = this.floatingHit();
    const validHit = this.isValidCursorHit(cursor.hit);
    if (!floatingHit && !validHit) {
      return undefined;
    }

    let hit = undefined;
    let isFloatingHit = false;

    if (validHit) {
      hit = cursor.hit;
    } else if (floatingHit !== undefined) {
      hit = floatingHit;
      isFloatingHit = true;
    }

    if (hit?.kind !== "terrain" && hit?.kind !== "blueprint") {
      return undefined;
    }

    const terrainAtPos = terrainAtPosition(this.deps.resources, hit.pos);
    const nonCollidingTerrainAtPosition = isNonCollidingTerrainAtPosition(
      this.deps.resources,
      hit.pos
    );
    const pos = nonCollidingTerrainAtPosition
      ? hit.pos
      : setPosition(hit.pos, hit.face ?? Dir.Y_POS);

    const isReplacement = isFloatingHit
      ? false
      : nonCollidingTerrainAtPosition && terrainAtPos !== 0;

    if (
      !this.deps.permissionsManager.itemActionAllowedAt(itemInfo.item, hit.pos)
    ) {
      if (onAction) {
        throw new AttackDestroyInteractionError({
          kind: "acl_permission",
          action: "place",
          pos: hit.pos,
        });
      }
      return undefined;
    } else if (
      isReplacement &&
      !this.deps.permissionsManager.getPermissionForAction(hit.pos, "destroy")
    ) {
      if (onAction) {
        throw new AttackDestroyInteractionError({
          kind: "acl_permission",
          action: "destroy",
          pos: hit.pos,
        });
      }
      return undefined;
    }

    return {
      pos,
      basePosition: hit.pos,
      face: hit.face ?? Dir.Y_POS,
      isReplacement,
    };
  }

  private floatingHit(): TerrainHit | undefined {
    const ppos = this.deps.resources.get("/scene/local_player").player.position;
    const penv = this.deps.resources.get(
      "/players/environment",
      this.deps.userId
    );
    if (!penv.onGround) {
      return undefined;
    }

    const cursor = this.deps.resources.get("/scene/cursor");
    const voxelCenterPos = add(floor(add(ppos, [0, -0.5, 0])), [0.5, 0.5, 0.5]);
    const camDir = normalizev2(xzProject(cursor.dir));
    const adjacentPos: Vec3f = [camDir[0], 0, camDir[1]];
    const marchDistance = 4;
    for (let i = 0; i < marchDistance; i += 1) {
      const vacantVoxelPos = floor(add(voxelCenterPos, scale(i, adjacentPos)));
      const collidingTerrainAtPosition = !isNonCollidingTerrainAtPosition(
        this.deps.resources,
        vacantVoxelPos
      );

      if (!collidingTerrainAtPosition) {
        const cast = intersectRayAabbFace(
          cursor.startPos,
          cursor.dir,
          [vacantVoxelPos, add(vacantVoxelPos, [1, 1, 1])],
          aabbFace[Dir.Y_POS]
        );

        if (cast) {
          const distance = dist(vacantVoxelPos, ppos);
          if (distance > MAX_FLOATING_HIT_DISTANCE) {
            return undefined;
          }
          return {
            kind: "terrain",
            pos: vacantVoxelPos,
            terrainId: 0,
            terrainSample: {
              terrainId: 0,
              dye: 0,
              moisture: 0,
              muck: 0,
            },
            face: Dir.Y_POS,
            distance,
          };
        }
        break;
      }
    }
  }
}
