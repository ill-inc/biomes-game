import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { BikkieRuntime } from "@/shared/bikkie/active";
import type { ItemAndCount } from "@/shared/game/types";

export const AdminInventoryCell: React.FunctionComponent<{
  slot: ItemAndCount | undefined;
  label?: string;
  onClick?: () => any;
}> = ({ slot, onClick, label }) => {
  if (!slot) {
    return <div className="cell" onClick={onClick}></div>;
  } else if (BikkieRuntime.get().getBiscuitOnlyIfExists(slot?.item?.id)) {
    return (
      <ItemTooltip item={slot?.item}>
        <div className="cell" onClick={onClick}>
          <InventoryCellContents slot={slot} label={label} />
        </div>
      </ItemTooltip>
    );
  } else {
    return (
      <div className="cell" onClick={onClick}>
        UNK
      </div>
    );
  }
};
