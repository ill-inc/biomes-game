import type {
  AttackDestroyDelegateDeps,
  AttackDestroyDelegateSpec,
} from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import { AttackDestroyDelegateItemSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";

export class DestroyerItemSpec extends AttackDestroyDelegateItemSpec {
  // This class is a bit funny, it just re-routes secondary actions to primary
  // which has the side effect of making destroy actions primary

  constructor(
    readonly deps: AttackDestroyDelegateDeps,
    readonly primarySpec?: AttackDestroyDelegateSpec
  ) {
    super(deps, {
      onPrimaryDown: (itemInfo: ClickableItemInfo) => {
        if (!primarySpec?.onPrimaryDown?.(itemInfo)) {
          this.onSecondaryDown(itemInfo);
        }
        return true;
      },
      onPrimaryUp: (itemInfo: ClickableItemInfo) => {
        if (!primarySpec?.onPrimaryUp?.(itemInfo)) {
          this.onSecondaryUp(itemInfo);
        }
        return true;
      },
      onPrimaryHoldTick: (itemInfo: ClickableItemInfo) => {
        if (!primarySpec?.onPrimaryHoldTick?.(itemInfo)) {
          this.onSecondaryHoldTick(itemInfo);
        }
        return true;
      },
    });
  }
}
