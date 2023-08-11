import type { ClientContextSubset } from "@/client/game/context";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { PressAndHoldInfo } from "@/client/game/interact/types";
import { chargeRemaining } from "@/shared/game/expiration";
import { clamp, cloneDeep } from "lodash";

export interface PressAndHoldSpec {
  holdLengthSeconds: (itemInfo: ClickableItemInfo) => number;
  onBeginHold?: (itemInfo: ClickableItemInfo) => void;
  onCancelHold?: (itemInfo: ClickableItemInfo) => void;
  onFinishHold: (itemInfo: ClickableItemInfo) => void;
}

export class PressAndHoldItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: ClientContextSubset<"userId" | "input" | "resources">,
    private readonly spec: PressAndHoldSpec
  ) {}

  onUnselected(itemInfo: ClickableItemInfo) {
    if (!this.pressAndHoldInfo?.finished) {
      this.spec.onCancelHold?.(itemInfo);
    }
    this.pressAndHoldInfo = undefined;
    return true;
  }

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    if (this.chargeRemaining(itemInfo) < 100) {
      return false;
    }

    const secondsSinceEpoch = this.deps.resources.get("/clock").time;
    this.spec.onBeginHold?.(itemInfo);
    this.pressAndHoldInfo = {
      start: secondsSinceEpoch,
      percentage: 0,
      finished: false,
      activeAction: {
        action: "warpHome",
        tool: itemInfo.item,
        toolRef: itemInfo.itemRef,
      },
    };
    return true;
  }

  onPrimaryHoldTick(itemInfo: ClickableItemInfo) {
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;

    if (!this.pressAndHoldInfo) {
      return false;
    }

    const newChannelingInfo = cloneDeep(this.pressAndHoldInfo);
    const duration = secondsSinceEpoch - newChannelingInfo.start;
    newChannelingInfo.percentage = clamp(
      duration / this.spec.holdLengthSeconds(itemInfo),
      0,
      1
    );

    if (
      newChannelingInfo.percentage >= 1.0 &&
      !this.pressAndHoldInfo.finished
    ) {
      newChannelingInfo.finished = true;
      this.spec.onFinishHold(itemInfo);
    }

    this.pressAndHoldInfo = newChannelingInfo;
    return true;
  }

  onPrimaryUp(itemInfo: ClickableItemInfo) {
    this.onUnselected(itemInfo);
    return true;
  }

  private chargeRemaining(itemInfo: ClickableItemInfo) {
    const tool = itemInfo.item;
    if (!tool) {
      return 100;
    }

    const secondsSinceEpoch = this.deps.resources.get("/clock").time;

    return chargeRemaining(tool, secondsSinceEpoch) ?? 100;
  }

  private get pressAndHoldInfo() {
    return this.deps.resources.get("/scene/local_player").pressAndHoldItemInfo;
  }

  private set pressAndHoldInfo(newVal: PressAndHoldInfo | undefined) {
    this.deps.resources.get("/scene/local_player").pressAndHoldItemInfo =
      newVal;
  }
}
