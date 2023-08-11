import type { ItemSlot, OwnedItemReference } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { createContext, useContext } from "react";

export type ClickPointType = {
  clientX: number;
  clientY: number;
};
export type InventoryAltClickContextType = {
  altClickUIEntityId?: BiomesId;
  altClickUISlot?: ItemSlot;
  showAltClickUIForSlotRef?: OwnedItemReference;
  setAltClickUIForSlotRef: (ref?: OwnedItemReference) => any;
  altClickUIClickPoint: ClickPointType | undefined;
};
export const InventoryAltClickContext = createContext(
  {} as unknown as InventoryAltClickContextType
);
export const useInventoryAltClickContext = () =>
  useContext(InventoryAltClickContext);
