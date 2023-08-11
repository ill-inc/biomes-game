import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import type { NormalSlotProps } from "@/client/components/inventory/NormalSlot";
import { NormalSlot } from "@/client/components/inventory/NormalSlot";
import type { PropsWithChildren } from "react";
import React from "react";

export const NormalSlotWithTooltip: React.FunctionComponent<
  PropsWithChildren<
    NormalSlotProps & {
      slotType?: "inventory" | "worn" | "shop";
    }
  >
> = (props) => {
  return (
    <ItemTooltip
      slotType={props.slotType}
      item={props.slot?.item}
      count={props.slot?.count}
      disabled={props.disabled}
    >
      <NormalSlot {...props} />
    </ItemTooltip>
  );
};
