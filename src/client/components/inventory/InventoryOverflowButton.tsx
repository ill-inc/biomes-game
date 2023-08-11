import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { DialogButton } from "@/client/components/system/DialogButton";
import { Img } from "@/client/components/system/Img";
import React from "react";
import inventoryOverflowIcon from "/public/hud/icon-overflow-inbox.png";

export const InventoryOverflowButton: React.FunctionComponent<{
  numItems: number;
  onClick: () => unknown;
}> = ({ onClick, numItems }) => {
  const className = "connected-overflow-button new-button offset";

  return (
    <ItemTooltip tooltip={"Inventory Overflow"}>
      <DialogButton
        extraClassNames={className}
        onClick={onClick}
        badgeCount={numItems}
      >
        <Img src={inventoryOverflowIcon.src} />
      </DialogButton>
    </ItemTooltip>
  );
};
