import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { NormalSlot } from "@/client/components/inventory/NormalSlot";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { PaneSlideoverTitleBar } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { InventoryMoveToOverflowEvent } from "@/shared/ecs/gen/events";
import type { ReadonlyItemAndCount } from "@/shared/ecs/gen/types";
import { maxInventoryStack } from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";
import { fireAndForget } from "@/shared/util/async";
import { bigIntMin } from "@/shared/util/bigint";
import { mapMap } from "@/shared/util/collections";
import { range } from "lodash";
import React, { useCallback, useEffect } from "react";

export const InventoryOverflowSlideover: React.FunctionComponent<{
  onClose?: () => unknown;
}> = ({ onClose }) => {
  const { reactResources, events, authManager, gardenHose, userId } =
    useClientContext();
  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const inventory = reactResources.use("/ecs/c/inventory", userId);

  let i = 0;

  useEffect(() => {
    gardenHose.publish({
      kind: "inventory_overflow_opened",
    });
  }, []);

  const slotClick = useCallback(
    (item?: ReadonlyItemAndCount) => {
      if (dragItem) {
        if (
          authManager.currentUser.hasSpecialRole("twoWayInbox") &&
          dragItem.kind === "inventory_drag"
        ) {
          const count = dragItem.quantity ?? dragItem.slot?.count;
          if (count) {
            fireAndForget(
              events.publish(
                new InventoryMoveToOverflowEvent({
                  id: userId,
                  src: dragItem.slotReference,
                  count,
                })
              )
            );
          }
        }
        setDragItem(null);
      } else if (item) {
        setDragItem({
          kind: "inventory_overflow",
          item: countOf(
            item.item,
            bigIntMin(item.count, maxInventoryStack(item.item))
          ),
        });
      }
    },
    [dragItem]
  );

  if (!inventory) {
    return <></>;
  }

  const numEmptySlots = Math.max(12 - inventory.overflow.size, 0);

  return (
    <PaneLayout>
      <PaneSlideoverTitleBar onClose={onClose}>
        <BarTitle>Inventory Oveflow</BarTitle>
      </PaneSlideoverTitleBar>

      <div className="drag-teaser">
        Items you receive when your inventory is full are added to your
        Inventory Overflow
      </div>

      <div className="inventory-cells normal">
        {mapMap(inventory.overflow, (item) => {
          i += 1;
          return (
            <NormalSlotWithTooltip
              key={`${i}${item.item.id}`}
              entityId={userId}
              slot={item}
              slotReference={{ kind: "item", idx: i }}
              onClick={() => slotClick(item)}
            />
          );
        })}
        {range(numEmptySlots).map((e) => {
          return (
            <NormalSlot
              key={`slot-${e}`}
              entityId={userId}
              slot={undefined}
              slotReference={{ kind: "item", idx: e }}
              onClick={() => slotClick(undefined)}
            />
          );
        })}
      </div>
    </PaneLayout>
  );
};
