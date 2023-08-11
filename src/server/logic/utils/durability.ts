import type { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";

export function decrementItemDurability(
  inventory: PlayerInventoryEditor,
  toolRef: OwnedItemReference,
  decrementAmount: number
) {
  const toolSlot = inventory.get(toolRef);
  if (!toolSlot) {
    return;
  }

  const remainingDurability = toolSlot.item.lifetimeDurabilityMs ?? 0;

  // Note: we are treating unspecified (0) as infinity
  if (remainingDurability === 0) {
    return;
  }
  const newDurability = remainingDurability - decrementAmount;
  inventory.set(
    toolRef,
    newDurability <= 0
      ? undefined
      : {
          count: toolSlot.count,
          item: anItem(toolSlot.item.id, {
            ...toolSlot.item.payload,
            [attribs.lifetimeDurabilityMs.id]: newDurability,
          }),
        }
  );
}
