import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { zClipboardWandItemData } from "@/server/logic/events/handlers/space_clipboard_wand";
import {
  SpaceClipboardWandCopyEvent,
  SpaceClipboardWandCutEvent,
  SpaceClipboardWandDiscardEvent,
  SpaceClipboardWandPasteEvent,
} from "@/shared/ecs/gen/events";
import { aabbToBox } from "@/shared/game/group";
import { add, ceil, floor, pointsToAABB, scale } from "@/shared/math/linear";
import { fireAndForget } from "@/shared/util/async";

export class SpaceClipboardWandItemSpec implements AttackDestroyDelegateSpec {
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
    this.deps.resources.set("/space_clipboard/preview_box", {
      box: undefined,
      mode: "unloaded",
    });
    return true;
  }

  get l1Radius() {
    return this.deps.resources.get("/space_clipboard/radius").value;
  }

  onTick(itemInfo: ClickableItemInfo) {
    const itemData = itemInfo.item?.data;
    const isLoaded = itemData !== undefined && itemData !== "";

    const cursor = this.deps.resources.get("/scene/cursor");
    const localPlayer = this.deps.resources.get("/scene/local_player");

    const origin = add(
      localPlayer.player.position,
      scale(2 * this.l1Radius, cursor.dir)
    );
    const boxStart = add(origin, [-this.l1Radius, 0, this.l1Radius]);
    const boxEnd = add(origin, [
      this.l1Radius,
      this.l1Radius * 2,
      -this.l1Radius,
    ]);
    const newBox = pointsToAABB(boxStart, boxEnd);

    this.deps.resources.set("/space_clipboard/preview_box", {
      box: [floor(newBox[0]), ceil(newBox[1])],
      mode: isLoaded ? "loaded" : "unloaded",
    });

    return true;
  }

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    const itemData = itemInfo.item?.data;
    const isLoaded = itemData !== undefined && itemData !== "";
    const previewBox = this.deps.resources.get("/space_clipboard/preview_box");

    if (!previewBox.box) {
      return false;
    }

    if (this.deps.actionThrottler.shouldThrottle("spaceClipboard")) {
      return false;
    }

    if (isLoaded) {
      const trueItemData = zClipboardWandItemData.parse(JSON.parse(itemData));
      fireAndForget(
        this.deps.events.publish(
          new SpaceClipboardWandPasteEvent({
            id: this.deps.userId,
            item_ref: itemInfo.itemRef,
            space_entity_id: trueItemData.stowed_entity_id,
            new_box: aabbToBox(previewBox.box),
          })
        )
      );
    } else {
      fireAndForget(
        this.deps.events.publish(
          new SpaceClipboardWandCopyEvent({
            id: this.deps.userId,
            item_ref: itemInfo.itemRef,
            box: aabbToBox(previewBox.box),
          })
        )
      );
    }

    this.deps.actionThrottler.use("spaceClipboard");
    return true;
  }

  onSecondaryDown(itemInfo: ClickableItemInfo) {
    const itemData = itemInfo.item?.data;
    const isLoaded = itemData !== undefined && itemData !== "";
    const previewBox = this.deps.resources.get("/space_clipboard/preview_box");

    if (!previewBox.box) {
      return false;
    }

    if (this.deps.actionThrottler.shouldThrottle("spaceClipboard")) {
      return false;
    }

    if (isLoaded) {
      const trueItemData = zClipboardWandItemData.parse(JSON.parse(itemData));
      fireAndForget(
        this.deps.events.publish(
          new SpaceClipboardWandDiscardEvent({
            id: this.deps.userId,
            item_ref: itemInfo.itemRef,
            space_entity_id: trueItemData.stowed_entity_id,
            new_box: aabbToBox(previewBox.box),
          })
        )
      );
    } else {
      fireAndForget(
        this.deps.events.publish(
          new SpaceClipboardWandCutEvent({
            id: this.deps.userId,
            item_ref: itemInfo.itemRef,
            box: aabbToBox(previewBox.box),
          })
        )
      );
    }

    this.deps.actionThrottler.use("spaceClipboard");
    return true;
  }
}
