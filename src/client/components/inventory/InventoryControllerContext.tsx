import type { ItemSlot, OwnedItemReference } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { createContext, useContext } from "react";

export type SlotMouseOverHandler = (
  entityId: BiomesId,
  slotReference: OwnedItemReference,
  slot: ItemSlot,
  ev: React.MouseEvent
) => any;

export type SlotClickHandler = (
  entityId: BiomesId,
  slotReference: OwnedItemReference,
  slot: ItemSlot,
  ev: React.MouseEvent,
  slotEnabled: boolean
) => any;

export type SlotKeyPressHandler = (
  entityId: BiomesId,
  slotReference: OwnedItemReference,
  slot: ItemSlot,
  ev: KeyboardEvent
) => any;

export type InventoryControllerContextType = {
  handleInventorySlotMouseOver: SlotMouseOverHandler;
  handleInventorySlotClick: SlotClickHandler;
  handleInventorySlotKeyPress: SlotKeyPressHandler;
  handleAvatarClick: () => boolean;
};

export const InventoryControllerContext = createContext(
  {} as unknown as InventoryControllerContextType
);

export const useInventoryControllerContext = () =>
  useContext(InventoryControllerContext);
