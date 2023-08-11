import type {
  ItemAndCount,
  ItemSlot,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";

export interface BaseDragItem {
  slotDropCallback?: (
    slotIdentifier: OwnedItemReference,
    slot: ItemSlot
  ) => any;
  clickOrigin?: {
    clientX: number;
    clientY: number;
  };
}

export type SlotReferenceWithOptionalCount = {
  slotReference: OwnedItemReference;
  count?: bigint;
};

export interface EphemeralDragItem extends BaseDragItem {
  kind: "ephemeral";
  item: ItemAndCount;
  quantity?: bigint;
}

export interface InventoryDragItem extends BaseDragItem {
  kind: "inventory_drag";
  entityId: BiomesId;
  slotReference: OwnedItemReference;
  slot: ItemSlot;
  quantity?: bigint;
}

export interface InventoryOverflowDragItem extends BaseDragItem {
  kind: "inventory_overflow";
  item: ItemAndCount;
  quantity?: undefined;
}

export type DragItem =
  | EphemeralDragItem
  | InventoryDragItem
  | InventoryOverflowDragItem;

export function isInventoryDragItem(
  dragItem: DragItem
): dragItem is InventoryDragItem {
  return dragItem.kind === "inventory_drag";
}

export function shouldHideOriginalCellItem(dragItem: DragItem) {
  if (!isInventoryDragItem(dragItem)) {
    return true;
  }

  return (
    dragItem.quantity === undefined ||
    dragItem.quantity >= (dragItem.slot?.count ?? 0)
  );
}
