import type { ClientContextSubset } from "@/client/game/context";
import type { ActiveItemScript } from "@/client/game/interact/types";
import type { ItemAndCount, OwnedItemReference } from "@/shared/ecs/gen/types";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import type { Item } from "@/shared/game/item";

export interface ClickableItemInfo {
  item?: Item;
  itemAndCount?: ItemAndCount;
  itemRef: OwnedItemReference;
}

export type ClickableItemSpecHandler = (itemInfo: ClickableItemInfo) => unknown;

export interface ClickableItemSpec {
  onSelected?: ClickableItemSpecHandler;
  onUnselected?: ClickableItemSpecHandler;
  onPrimaryDown?: ClickableItemSpecHandler;
  onPrimaryHoldTick?: ClickableItemSpecHandler;
  onPrimaryUp?: ClickableItemSpecHandler;
  onSecondaryDown?: ClickableItemSpecHandler;
  onSecondaryHoldTick?: ClickableItemSpecHandler;
  onSecondaryUp?: ClickableItemSpecHandler;
  onTick?: ClickableItemSpecHandler;
}

export type ClickableItemScriptContext = ClientContextSubset<
  "userId" | "input" | "resources"
>;

export class ClickableItemScript implements ActiveItemScript {
  private lastPrimaryHoldStart?: number;
  private lastSecondaryHoldStart?: number;

  constructor(
    readonly deps: ClickableItemScriptContext,
    private readonly itemRef: OwnedItemReference,
    private readonly spec: ClickableItemSpec
  ) {}

  onSelected() {
    this.spec.onSelected?.(this.itemInfo());
  }

  onUnselected() {
    this.spec.onUnselected?.(this.itemInfo());
  }

  tick() {
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;
    const itemInfo = this.itemInfo();

    if (
      !this.deps.resources.get("/ruleset/current").canUseItem(itemInfo.item)
    ) {
      return;
    }

    if (this.deps.input.motion("primary_hold")) {
      if (!this.lastPrimaryHoldStart) {
        this.lastPrimaryHoldStart = secondsSinceEpoch;
        this.spec.onPrimaryDown?.(itemInfo);
      }

      this.spec.onPrimaryHoldTick?.(itemInfo);
    } else {
      if (this.lastPrimaryHoldStart) {
        this.lastPrimaryHoldStart = undefined;
        this.spec.onPrimaryUp?.(itemInfo);
      }
    }

    if (this.deps.input.motion("secondary_hold")) {
      if (!this.lastSecondaryHoldStart) {
        this.lastSecondaryHoldStart = secondsSinceEpoch;
        this.spec.onSecondaryDown?.(itemInfo);
      }

      this.spec.onSecondaryHoldTick?.(itemInfo);
    } else {
      if (this.lastSecondaryHoldStart) {
        this.lastSecondaryHoldStart = undefined;
        this.spec.onSecondaryUp?.(itemInfo);
      }
    }

    this.spec.onTick?.(itemInfo);
  }

  private itemInfo(): ClickableItemInfo {
    const item = maybeGetSlotByRef(
      {
        inventory: this.deps.resources.get(
          "/ecs/c/inventory",
          this.deps.userId
        ),
      },
      this.itemRef
    );

    return {
      item: item?.item,
      itemAndCount: item,
      itemRef: this.itemRef,
    };
  }
}
