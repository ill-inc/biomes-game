import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryControllerContext } from "@/client/components/inventory/InventoryControllerContext";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import type { OpenContainer } from "@/client/components/inventory/types";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { anItem, resolveItemAttributeId } from "@/shared/game/item";
import type { ItemAndCount } from "@/shared/game/types";
import { rowMajorIdx } from "@/shared/util/helpers";
import { range } from "lodash";
import type { PropsWithChildren } from "react";
import React from "react";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";

export const StorageContainerLeftPaneContent: React.FunctionComponent<{
  openContainer: OpenContainer;
}> = ({ openContainer }) => {
  const { handleInventorySlotClick } = useInventoryControllerContext();
  const { reactResources } = useClientContext();
  const containerInventory = reactResources.use(
    "/ecs/c/container_inventory",
    openContainer.containerId
  );

  const numItems = containerInventory?.items.length ?? 0;
  const numCols = anItem(openContainer.itemId).numCols || 1;

  const derivedNumRows = Math.ceil(numItems / numCols);

  return (
    <PaneLayout extraClassName="inventory-left-pane">
      <div className="padded-view padded-view-inventory">
        <ItemIcon
          item={anItem(openContainer.itemId)}
          className="container-icon"
        />
        <div className="inventory-cells">
          {range(derivedNumRows).map((row) => (
            <React.Fragment key={`row${row}`}>
              {range(numCols).map((col) => {
                const slotIdx = rowMajorIdx(numCols, row, col);
                return (
                  <NormalSlotWithTooltip
                    key={`row${row}-item-${col}`}
                    slotType="inventory"
                    entityId={openContainer.containerId}
                    slot={containerInventory?.items[slotIdx]}
                    slotReference={{
                      kind: "item",
                      idx: slotIdx,
                    }}
                    onClick={handleInventorySlotClick}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </PaneLayout>
  );
};

export const StorageContainerScreen: React.FunctionComponent<
  PropsWithChildren<{
    openContainer: OpenContainer;
  }>
> = ({ openContainer, children }) => {
  const containerItem = anItem(openContainer.itemId);
  const screenTitle = containerItem.displayName;

  const disableSlotPredicate = (item: ItemAndCount | undefined) => {
    if (containerItem.compatibleItemPredicates === undefined) {
      return false;
    }

    if (!item) {
      return true;
    }

    for (const attributeId of containerItem.compatibleItemPredicates) {
      if (resolveItemAttributeId(item.item, attributeId)) {
        return false;
      }
    }
    return true;
  };

  return (
    <SplitPaneScreen
      extraClassName="profile"
      leftPaneExtraClassName="biomes-box"
      rightPaneExtraClassName="biomes-box"
    >
      <ScreenTitleBar title={screenTitle} />
      <RawLeftPane>
        <StorageContainerLeftPaneContent openContainer={openContainer} />
      </RawLeftPane>
      <RawRightPane>
        <SelfInventoryRightPane disableSlotPredicate={disableSlotPredicate}>
          {children}
        </SelfInventoryRightPane>
      </RawRightPane>
    </SplitPaneScreen>
  );
};
