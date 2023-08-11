import type {
  ItemAndCount,
  ItemSlot,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";

export type DisableSlotPredicate = (
  item: ItemAndCount | undefined,
  ref: OwnedItemReference
) => boolean;

export type DragData = {
  slot: ItemSlot;
  slotIdentifier: OwnedItemReference;
  sourceElementId: string;
};

export type OpenContainer = {
  containerId: BiomesId;
  itemId: BiomesId;
};
