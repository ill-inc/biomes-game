import { attribs } from "@/shared/bikkie/schema/attributes";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import type { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { anItem } from "@/shared/game/item";

export function decrementItemWaterAmount(
  inventory: PlayerInventoryEditor,
  toolRef: OwnedItemReference,
  maxDecrementAmount: number
) {
  const toolSlot = inventory.get(toolRef);
  if (!toolSlot?.item) {
    return 0;
  }
  const waterAmount = toolSlot.item.waterAmount;
  const decrementAmount = Math.min(waterAmount, maxDecrementAmount);
  const newWaterAmount = waterAmount - decrementAmount;

  inventory.set(toolRef, {
    count: toolSlot.count,
    item: anItem(toolSlot.item.id, {
      ...toolSlot.item.payload,
      [attribs.waterAmount.id]: newWaterAmount,
    }),
  });

  return decrementAmount;
}

export function restoreItemWaterAmount(
  inventory: PlayerInventoryEditor,
  toolRef: OwnedItemReference,
  maxRestoreAmount?: number
) {
  const toolSlot = inventory.get(toolRef);
  if (!toolSlot?.item) {
    return;
  }
  const waterAmount = toolSlot.item.waterAmount;
  const totalWaterAmount = anItem(toolSlot.item.id)?.waterAmount;
  const restoreAmount = Math.min(
    totalWaterAmount - waterAmount,
    maxRestoreAmount ?? totalWaterAmount
  );
  const newWaterAmount = waterAmount + restoreAmount;

  inventory.set(toolRef, {
    count: toolSlot.count,
    item: anItem(toolSlot.item.id, {
      ...toolSlot.item.payload,
      [attribs.waterAmount.id]: newWaterAmount,
    }),
  });
  return restoreAmount;
}
