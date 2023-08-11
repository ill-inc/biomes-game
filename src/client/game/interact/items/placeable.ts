import { isNonCollidingTerrainAtPosition } from "@/client/game/helpers/blueprint";
import { allowPlacement } from "@/client/game/helpers/placeables";
import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import {
  changeRadius,
  handlePlacePlaceableInteraction,
  preparePlaceablePlacement,
} from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { isAclAction } from "@/shared/acl_types";
import { hitExistingTerrain, setPosition } from "@/shared/game/spatial";
import { Dir } from "@/shared/wasm/types/common";

export class PlaceableItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "gardenHose"
      | "userId"
      | "table"
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
    if (placement) {
      const prep = preparePlaceablePlacement(
        this.deps,
        placement.position,
        placement.face,
        itemInfo.item,
        itemInfo.itemRef
      );
      if (prep) {
        handlePlacePlaceableInteraction(this.deps, prep);
        const player = this.deps.resources.get("/scene/local_player").player;
        player.eagerEmote(this.deps.events, this.deps.resources, "place");
        return true;
      }
    }

    return false;
  }

  protected getPlacement(itemInfo: ClickableItemInfo, onAction = false) {
    if (!itemInfo.item) {
      return false;
    }

    const { hit } = this.deps.resources.get("/scene/cursor");

    if (!hitExistingTerrain(hit)) {
      return undefined;
    }

    if (!itemInfo.item.action) {
      return false;
    }

    if (
      !this.deps.permissionsManager.itemActionAllowedAt(itemInfo.item, hit.pos)
    ) {
      if (onAction) {
        throw new AttackDestroyInteractionError({
          kind: "acl_permission",
          action: isAclAction(itemInfo.item.action)
            ? itemInfo.item.action
            : "place",
          pos: hit.pos,
        });
      }
      return undefined;
    }

    if (hit.distance > changeRadius(this.deps.resources)) {
      return undefined;
    }

    const nonCollidingTerrainAtPosition = isNonCollidingTerrainAtPosition(
      this.deps.resources,
      hit.pos
    );
    if (
      nonCollidingTerrainAtPosition &&
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

    const placeablePosition = nonCollidingTerrainAtPosition
      ? hit.pos
      : setPosition(hit.pos, hit.face);
    const placeableFace = nonCollidingTerrainAtPosition ? undefined : hit.face;

    if (!allowPlacement(itemInfo.item, placeableFace ?? Dir.Y_POS)) {
      return undefined;
    }

    return {
      position: placeablePosition,
      basePosition: hit.pos,
      face: placeableFace ?? Dir.Y_POS,
      isReplacement: nonCollidingTerrainAtPosition,
    };
  }
}
