import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import { changeRadius, shapeTerrain } from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { shapeIDs } from "@/galois/assets/shapes";
import type { ShapeName } from "@/shared/asset_defs/shapes";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import { toShapeId } from "@/shared/game/ids";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { getIsomorphismIdAtPosition } from "@/shared/game/terrain_helper";
import type { ReadonlyVec3 } from "@/shared/math/types";

interface ShapeRequest {
  pos: ReadonlyVec3;
  shape: ShapeName;
  itemRef: OwnedItemReference;
}

// DEPRECATED
// TODO: Remove once all shapers are replaced with the new shaper action
export class ShapeItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "gardenHose"
      | "userId"
      | "table"
      | "audioManager"
      | "voxeloo"
    >
  ) {}

  private hasPermissionToShape({ pos }: ShapeRequest): boolean {
    if (!this.deps.permissionsManager.getPermissionForAction(pos, "shape")) {
      return false;
    }
    return true;
  }

  private getShapeRequest(
    itemInfo: ClickableItemInfo
  ): ShapeRequest | undefined {
    if (!itemInfo.item) {
      return undefined;
    }

    const shapeName = itemInfo.item.shape;
    if (!shapeName) {
      return undefined;
    }

    const { hit } = this.deps.resources.get("/scene/cursor");
    if (
      !hitExistingTerrain(hit) ||
      hit.distance > changeRadius(this.deps.resources)
    ) {
      return undefined;
    }

    const request = {
      pos: hit.pos,
      shape: shapeName,
      itemRef: itemInfo.itemRef,
    };

    // Error out if you can shape but don't have permission.
    if (!this.hasPermissionToShape(request)) {
      throw new AttackDestroyInteractionError({
        kind: "acl_permission",
        action: "shape",
        pos: request.pos,
      });
    }

    return request;
  }

  // Carry of the shape request. Returns true if successful and false otherwise.
  private performShape(shapeRequest: ShapeRequest): boolean {
    if (
      shapeTerrain(
        this.deps,
        shapeRequest.pos,
        shapeRequest.shape,
        shapeRequest.itemRef
      )
    ) {
      const player = this.deps.resources.get("/scene/local_player").player;
      player.eagerEmote(this.deps.events, this.deps.resources, "place");
      return true;
    }
    return false;
  }

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    const shapeRequest = this.getShapeRequest(itemInfo);

    if (shapeRequest) {
      return this.performShape(shapeRequest);
    }
    return false;
  }

  onSecondaryDown(itemInfo: ClickableItemInfo) {
    const shapeRequest = this.getShapeRequest(itemInfo);
    if (!shapeRequest) {
      return false;
    }
    const isomorphism = getIsomorphismIdAtPosition(
      this.deps.voxeloo,
      this.deps.resources,
      shapeRequest.pos
    );
    if (isomorphism === undefined || toShapeId(isomorphism) === shapeIDs.full) {
      // Block is already full.
      return false;
    }

    shapeRequest.shape = "full";
    this.performShape(shapeRequest);
    return false;
  }
}
