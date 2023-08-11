import type { SlotClickHandler } from "@/client/components/inventory/InventoryControllerContext";
import type { DisableSlotPredicate } from "@/client/components/inventory/types";
import { WearableSlot } from "@/client/components/inventory/WearableSlot";
import { WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import type { BiomesId } from "@/shared/ids";
import type { PropsWithChildren } from "react";
import React from "react";

// Assumes ordering of WEARABLE_SLOTS is what we'd like to use, and that this is
// 10 items long.
const leftKeys = WEARABLE_SLOTS.slice(0, 5);
const rightKeys = WEARABLE_SLOTS.slice(5);

export const WearableCells: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
    onSlotClick?: SlotClickHandler;
    disableSlotPredicate?: DisableSlotPredicate;
  }>
> = ({ entityId, onSlotClick, disableSlotPredicate, children }) => {
  // TODO: we need a 'strong get' even if the player is not in near radius
  // so we can get non-null wearables.
  return (
    <div className="inventory-cells wearables">
      <div className="wearables-col">
        {leftKeys.map((key) => (
          <WearableSlot
            key={key}
            itemKey={key}
            entityId={entityId}
            onSlotClick={onSlotClick}
            slotReference={{ kind: "wearable", key }}
            disableSlotPredicate={disableSlotPredicate}
          />
        ))}
      </div>
      <div className="wearables-center">{children}</div>
      <div className="wearables-col">
        {rightKeys.map((key) => (
          <WearableSlot
            key={key}
            itemKey={key}
            entityId={entityId}
            onSlotClick={onSlotClick}
            slotReference={{ kind: "wearable", key }}
            disableSlotPredicate={disableSlotPredicate}
          />
        ))}
      </div>
    </div>
  );
};
