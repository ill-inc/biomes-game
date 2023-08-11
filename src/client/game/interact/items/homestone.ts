import type { ClientContextSubset } from "@/client/game/context";
import type { PressAndHoldSpec } from "@/client/game/interact/item_types/press_and_hold_item_spec";
import type { ActionType } from "@/client/game/interact/types";
import type { TimeWindow } from "@/shared/util/throttling";

export class HomestoneItemSpec implements PressAndHoldSpec {
  constructor(
    readonly deps: ClientContextSubset<"resources" | "events"> & {
      actionThrottler: TimeWindow<ActionType>;
    }
  ) {}

  holdLengthSeconds() {
    return 1.0;
  }
  onCancelHold() {
    const localPlayer = this.deps.resources.get("/scene/local_player");
    localPlayer.player.eagerCancelEmote(this.deps.events);
  }
  onBeginHold() {
    const localPlayer = this.deps.resources.get("/scene/local_player");
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;
    if (!localPlayer.player.isEmoting(secondsSinceEpoch, "wave")) {
      localPlayer.player.eagerEmote(
        this.deps.events,
        this.deps.resources,
        "wave"
      );
    }
  }

  onFinishHold() {
    if (this.deps.actionThrottler.shouldThrottle("warpHome")) {
      return;
    }

    this.deps.actionThrottler.use("warpHome");
    this.deps.resources.set("/game_modal", {
      kind: "homestone",
    });
  }
}
