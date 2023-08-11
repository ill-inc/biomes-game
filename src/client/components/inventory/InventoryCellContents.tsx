import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import type { ItemSlot } from "@/shared/ecs/gen/types";
import React from "react";
import recipeIcon from "/public/hud/icon-16-recipe.png";

export const InventoryCellContents: React.FunctionComponent<{
  slot?: ItemSlot;
  overrideCount?: bigint;
  label?: string;
}> = React.memo(({ slot, overrideCount, label }) => {
  const baseIcon: JSX.Element = <></>;

  if (slot) {
    const count = Number(overrideCount ?? slot.count);

    return (
      <div className="absolute inset-0 flex">
        <ItemIcon item={slot.item} draggable={false} />
        {slot.item.isRecipe && (
          <div className="corner-badge">
            <img src={recipeIcon.src} />
          </div>
        )}

        {label && <div className="cell-label-overlay">{label}</div>}
        {count > 1 && <div className="amount-overlay">{count}</div>}
      </div>
    );
  }
  return baseIcon;
});
