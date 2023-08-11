import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useClientSideContainer } from "@/client/components/inventory/client_side_container";
import {
  CraftButton,
  useCraftingDelay,
} from "@/client/components/inventory/crafting/CraftingDetail";
import { CraftingStationRoyaltyFeeListing } from "@/client/components/inventory/crafting/CraftingStationRoyaltyFeeListing";
import { useOwnedItems } from "@/client/components/inventory/helpers";
import type { SlotClickHandler } from "@/client/components/inventory/InventoryControllerContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { InventoryOverrideContextProvider } from "@/client/components/inventory/InventoryOverrideContext";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { ItemAndCount, OwnedItemReference } from "@/shared/ecs/gen/types";
import type { InventoryAssignmentPattern } from "@/shared/game/inventory";
import { getSlotByRef } from "@/shared/game/inventory";
import { isDroppableItem } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { ok } from "assert";
import { compact, range } from "lodash";
import { useCallback } from "react";

const CRAFT_DURATION = 1000;

const UnorderedCraftingStationLeftPane: React.FunctionComponent<{
  slots: number;
  stationEntityId: BiomesId;
  extraClassName: string;
  craftVerb: string;
  multiItemSlot: boolean;
  minItems: number;
  onCraft: (src: InventoryAssignmentPattern) => Promise<void>;
}> = ({
  slots,
  stationEntityId,
  extraClassName,
  craftVerb,
  multiItemSlot,
  minItems,
  onCraft,
}) => {
  const { reactResources, userId } = useClientContext();
  const clientSideContainer = useClientSideContainer(slots);
  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const { inventory, wearing } = useOwnedItems(reactResources, userId);
  const { isCrafting, delayClearCrafting } = useCraftingDelay(
    CRAFT_DURATION + 1500
  );

  const handleItemCellClick = useCallback<SlotClickHandler>(
    (_entityId, slotReference, _slot, _ev) => {
      ok(slotReference.kind === "item");
      const itemItem = clientSideContainer.slots[slotReference.idx];
      if (dragItem && dragItem.kind === "inventory_drag") {
        const slot = getSlotByRef(
          { inventory, wearing },
          dragItem.slotReference
        );
        if (slot && isDroppableItem(slot.item)) {
          clientSideContainer.setSlotAtIndex(slotReference.idx, {
            refSlot: dragItem.slotReference,
            quantity: (multiItemSlot && dragItem.slot?.count) || 1n,
          });
        }
        setDragItem(null);
      } else if (itemItem) {
        setDragItem({
          kind: "ephemeral",
          item: itemItem.item,
          slotDropCallback: () => {
            clientSideContainer.setSlotAtIndex(slotReference.idx, undefined);
            setDragItem(null);
          },
        });
      }
    },
    [dragItem, inventory, wearing, clientSideContainer]
  );

  const handleCraft = useCallback(async () => {
    const src = clientSideContainer.slots.flatMap((slot) =>
      slot
        ? ([[slot.refSlot, slot.item]] as Array<
            [OwnedItemReference, ItemAndCount]
          >)
        : []
    );
    await onCraft(src);
    clientSideContainer.clear();
  }, [clientSideContainer, onCraft]);

  return (
    <PaneLayout
      extraClassName={`${extraClassName ?? "crafting"}-station`}
      type="center_both"
    >
      {range(0, slots).map((_, idx) => (
        <NormalSlotWithTooltip
          key={idx}
          slot={clientSideContainer.slots[idx]?.item}
          slotReference={{
            kind: "item",
            idx,
          }}
          entityId={INVALID_BIOMES_ID}
          onClick={handleItemCellClick}
        />
      ))}
      <PaneBottomDock>
        <CraftingStationRoyaltyFeeListing stationEntityId={stationEntityId} />
        <CraftButton
          isCrafting={isCrafting}
          craftDuration={CRAFT_DURATION}
          disabled={compact(clientSideContainer.slots).length < minItems}
          onClick={() => {
            delayClearCrafting();
            void handleCraft();
          }}
        >
          {craftVerb}
        </CraftButton>
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const UnorderedCraftingStationScreen: React.FunctionComponent<{
  slots: number;
  stationEntityId: BiomesId;
  title?: string;
  extraClassName?: string;
  craftVerb?: string;
  multiItemSlot?: boolean;
  minItems?: number;
  onCraft: (src: InventoryAssignmentPattern) => Promise<void>;
}> = ({
  slots,
  title,
  stationEntityId,
  extraClassName,
  craftVerb,
  onCraft,
  multiItemSlot,
  minItems,
}) => {
  title ??= "Crafting Station";
  craftVerb ??= "Craft";
  multiItemSlot ??= false;
  minItems ??= 1;
  extraClassName ??= "crafting";
  return (
    <InventoryOverrideContextProvider>
      <SplitPaneScreen
        extraClassName={extraClassName}
        leftPaneExtraClassName="biomes-box"
        rightPaneExtraClassName="biomes-box"
      >
        <ScreenTitleBar title={title} divider={false} />

        <RawLeftPane>
          <UnorderedCraftingStationLeftPane
            slots={slots}
            extraClassName={`${extraClassName}-station`}
            stationEntityId={stationEntityId}
            craftVerb={craftVerb}
            onCraft={onCraft}
            multiItemSlot={multiItemSlot}
            minItems={minItems}
          />
        </RawLeftPane>

        <RawRightPane>
          <SelfInventoryRightPane />
        </RawRightPane>
      </SplitPaneScreen>
    </InventoryOverrideContextProvider>
  );
};
