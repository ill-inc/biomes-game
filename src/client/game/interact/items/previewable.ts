import { changeRadius } from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import {
  actualizePlaceablePreview,
  beginShowingPlaceablePreviewAtCoordinate,
} from "@/client/game/scripts/group_placement";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { add } from "@/shared/math/linear";

export class PreviewableItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "userId"
      | "table"
      | "voxeloo"
    >
  ) {}

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    if (this.previewActive && itemInfo.item) {
      actualizePlaceablePreview(
        this.deps.resources,
        this.deps.permissionsManager,
        this.deps.events,
        this.deps.userId,
        itemInfo.item,
        itemInfo.itemRef
      );
      return true;
    }

    const { hit } = this.deps.resources.get("/scene/cursor");

    if (
      itemInfo.item &&
      hitExistingTerrain(hit) &&
      hit.distance <= changeRadius(this.deps.resources)
    ) {
      const position = add(hit.pos, [0.5, 0, 0.5]);
      void beginShowingPlaceablePreviewAtCoordinate(
        this.deps,
        position,
        itemInfo.item,
        itemInfo.itemRef
      );

      return true;
    }

    return false;
  }

  allowsSecondaryDelegation() {
    return !this.previewActive;
  }

  get previewActive() {
    return this.deps.resources.get("/groups/placement/preview").active();
  }
}
