import type { ItemAndCount } from "@/shared/ecs/gen/types";

import { createContext, useContext } from "react";

export interface TooltipFlair {
  kind: "sale";
  unitPrice: ItemAndCount;
}

export type InventoryViewContextType = {
  tooltipFlairForItem: (item: ItemAndCount) => TooltipFlair[];
};

export const InventoryViewContext = createContext<InventoryViewContextType>({
  tooltipFlairForItem() {
    return [];
  },
});

export const useInventoryViewContext = () => useContext(InventoryViewContext);
