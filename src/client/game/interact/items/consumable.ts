import type { ClientContextSubset } from "@/client/game/context";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { PressAndHoldSpec } from "@/client/game/interact/item_types/press_and_hold_item_spec";
import { ConsumptionEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";

export class ConsumableItemSpec implements PressAndHoldSpec {
  constructor(
    readonly deps: ClientContextSubset<
      "userId" | "resources" | "events" | "audioManager"
    >
  ) {}

  holdLengthSeconds() {
    return 1.0;
  }

  onBeginHold(itemInfo: ClickableItemInfo) {
    const action = itemInfo.item?.action as "eat" | "drink";
    const localPlayer = this.deps.resources.get("/scene/local_player");
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;
    if (!localPlayer.player.isEmoting(secondsSinceEpoch, action)) {
      localPlayer.player.eagerEmote(
        this.deps.events,
        this.deps.resources,
        action
      );
    }
  }

  onCancelHold() {
    const localPlayer = this.deps.resources.get("/scene/local_player");
    localPlayer.player.eagerCancelEmote(this.deps.events);
  }

  onFinishHold(itemInfo: ClickableItemInfo) {
    if (!itemInfo.item) {
      return;
    }
    const action = itemInfo.item.action as "eat" | "drink";
    this.deps.audioManager.playSound(
      action === "drink" ? "buff_drink" : "buff_eat"
    );
    fireAndForget(
      this.deps.events.publish(
        new ConsumptionEvent({
          id: this.deps.userId,
          item_id: itemInfo.item.id,
          inventory_ref: itemInfo.itemRef,
          action: action,
        })
      )
    );
  }
}
