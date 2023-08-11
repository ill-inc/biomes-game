import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useOwnedItems } from "@/client/components/inventory/helpers";
import { iconUrl } from "@/client/components/inventory/icons";
import type { SlotClickHandler } from "@/client/components/inventory/InventoryControllerContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { useInventoryOverrideContext } from "@/client/components/inventory/InventoryOverrideContext";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { NormalSlot } from "@/client/components/inventory/NormalSlot";
import type { DisableSlotPredicate } from "@/client/components/inventory/types";
import {
  isInventoryDragItem,
  shouldHideOriginalCellItem,
} from "@/client/util/drag_helpers";
import type {
  ItemAndCount,
  ItemSlot,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import {
  getSlotByRef,
  OwnedItemReferencesEqual,
} from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import React from "react";

export const WearableSlot: React.FC<{
  itemKey: BiomesId;
  entityId: BiomesId;
  slotReference: OwnedItemReference;
  slot?: ItemSlot;
  onSlotClick?: SlotClickHandler;
  disableSlotPredicate?: DisableSlotPredicate;
  toolTip?: string;
}> = ({
  itemKey,
  entityId,
  slotReference: ref,
  slot,
  onSlotClick,
  disableSlotPredicate,
  toolTip = undefined,
}) => {
  const { dragItem } = useInventoryDraggerContext();
  const { reactResources, userId } = useClientContext();
  const { inventory, wearing } = useOwnedItems(reactResources, entityId);
  const inventoryOverrideContext = useInventoryOverrideContext();
  const override = inventoryOverrideContext.overrideAt(ref);
  const content = override
    ? override.value
    : slot ?? getSlotByRef({ inventory, wearing }, ref);
  let showEmpty = !content;
  const classNames = ["cell", "wearable-cell", itemKey];

  const disableDragPredicate = (item: ItemAndCount | undefined) => {
    if (item === undefined) {
      return false;
    }
    const isWearable = item?.item.isWearable ?? false;
    return isWearable === false;
  };

  if (
    dragItem?.kind === "inventory_drag" &&
    shouldHideOriginalCellItem(dragItem) &&
    OwnedItemReferencesEqual(dragItem.slotReference, ref)
  ) {
    showEmpty = true;
    classNames.push("being-dragged");
  }

  const slotImageUrl = iconUrl(anItem(itemKey));
  const showTooltip = showEmpty;

  let draggedItem: ItemAndCount | undefined = undefined;
  if (dragItem && isInventoryDragItem(dragItem)) {
    draggedItem = dragItem.slot;
  }

  const disabled = Boolean(
    disableDragPredicate(draggedItem) || disableSlotPredicate?.(content, ref)
  );

  return (
    <ItemTooltip
      item={content?.item}
      slotType="worn"
      tooltip={
        showTooltip ? toolTip ?? anItem(itemKey)?.displayTooltip : undefined
      }
      disabled={disabled}
      ownerView={userId === entityId}
    >
      <NormalSlot
        extraClassName={classNames.join(" ")}
        emptyImg={slotImageUrl}
        disabled={disabled}
        entityId={entityId}
        slot={content}
        slotReference={ref}
        onClick={onSlotClick}
      />
    </ItemTooltip>
  );
};
