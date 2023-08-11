import {
  CharacterPreview,
  makePreviewSlot,
} from "@/client/components/character/CharacterPreview";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useClientSideContainer } from "@/client/components/inventory/client_side_container";
import { useOwnedItems } from "@/client/components/inventory/helpers";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { InventoryOverrideContextProvider } from "@/client/components/inventory/InventoryOverrideContext";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { DialogButton } from "@/client/components/system/DialogButton";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { InventoryDyeEvent } from "@/shared/ecs/gen/events";
import type { ItemAssignment } from "@/shared/ecs/gen/types";
import { getSlotByRef } from "@/shared/game/inventory";
import type { ItemPayload } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { isDyeItem, itemIsDyeable } from "@/shared/util/dye_helpers";
import { compact } from "lodash";
import { useCallback, useMemo } from "react";

const DyingCraftingStationLeftPane: React.FunctionComponent<{}> = ({}) => {
  const { events, reactResources, userId } = useClientContext();
  const { inventory, wearing } = useOwnedItems(reactResources, userId);

  const { dragItem, setDragItem } = useInventoryDraggerContext();

  const clientSideContainer = useClientSideContainer(2);
  const DYE_IDX = 0;
  const ITEM_IDX = 1;

  const handleDyeCellClick = useCallback(() => {
    const dyeItem = clientSideContainer.slots[DYE_IDX];
    if (dragItem && dragItem.kind === "inventory_drag") {
      const slot = getSlotByRef({ inventory, wearing }, dragItem.slotReference);
      if (slot && isDyeItem(slot.item)) {
        clientSideContainer.setSlotAtIndex(DYE_IDX, {
          refSlot: dragItem.slotReference,
          quantity: 1n,
        });
      }
      setDragItem(null);
    } else if (dyeItem) {
      setDragItem({
        kind: "ephemeral",
        item: dyeItem.item,
        slotDropCallback: () => {
          clientSideContainer.setSlotAtIndex(DYE_IDX, undefined);
          setDragItem(null);
        },
      });
    }
  }, [dragItem, clientSideContainer]);

  const handleItemCellClick = useCallback(() => {
    const itemItem = clientSideContainer.slots[ITEM_IDX];
    if (dragItem && dragItem.kind === "inventory_drag") {
      const slot = getSlotByRef({ inventory, wearing }, dragItem.slotReference);
      if (slot && itemIsDyeable(slot.item)) {
        clientSideContainer.setSlotAtIndex(ITEM_IDX, {
          refSlot: dragItem.slotReference,
          quantity: 1n,
        });
      }
      setDragItem(null);
    } else if (itemItem) {
      setDragItem({
        kind: "ephemeral",
        item: itemItem.item,
        slotDropCallback: () => {
          clientSideContainer.setSlotAtIndex(ITEM_IDX, undefined);
          setDragItem(null);
        },
      });
    }
  }, [dragItem, inventory, wearing, clientSideContainer]);

  const handleDye = useCallback(async () => {
    const dyeItem = clientSideContainer.slots[DYE_IDX];
    const itemItem = clientSideContainer.slots[ITEM_IDX];
    if (!dyeItem || !itemItem) {
      return;
    }
    await events.publish(
      new InventoryDyeEvent({
        id: userId,
        src: dyeItem.refSlot,
        dst: itemItem.refSlot,
      })
    );

    clientSideContainer.clear();
  }, [clientSideContainer]);

  const wearableOverrides = useMemo(() => {
    const ret: ItemAssignment = new Map(wearing?.items.entries());
    const dyeItem = clientSideContainer.slots[DYE_IDX];
    const itemItem = clientSideContainer.slots[ITEM_IDX];
    if (itemItem) {
      const slot = findItemEquippableSlot(itemItem.item.item);
      if (slot) {
        if (dyeItem) {
          const base: ItemPayload = {
            ...itemItem.item.item.payload,
            [attribs.dyedWith.id]: dyeItem.item.item.id,
          };
          ret.set(slot, anItem(itemItem.item.item.id, base));
        } else {
          ret.set(slot, itemItem.item.item);
        }
      }
    }
    return ret;
  }, [wearing, clientSideContainer]);
  return (
    <PaneLayout extraClassName="dying-station" type="center_both">
      <div className="bg-image" />
      <div className="slotter dye">
        <NormalSlotWithTooltip
          slot={clientSideContainer.slots[DYE_IDX]?.item}
          slotReference={{
            kind: "item",
            idx: 0,
          }}
          entityId={123 as BiomesId}
          onClick={handleDyeCellClick}
        />
        <div className="label">Dye</div>
      </div>
      <div className="divider" />
      <div className="slotter item">
        <NormalSlotWithTooltip
          slot={clientSideContainer.slots[ITEM_IDX]?.item}
          slotReference={{
            kind: "item",
            idx: 0,
          }}
          entityId={123 as BiomesId}
          onClick={handleItemCellClick}
        />
        <div className="label">Dyable Item</div>
      </div>
      <div className="divider" />
      <div className="slotter preview">
        <CharacterPreview
          key="bbq"
          previewSlot={makePreviewSlot("dying", userId)}
          wearableOverrides={wearableOverrides}
          entityId={userId}
        />
        <div className="label">Preview</div>
      </div>
      <PaneBottomDock>
        <DialogButton
          type="primary"
          disabled={compact(clientSideContainer.slots).length !== 2}
          onClick={handleDye}
        >
          Dye
        </DialogButton>
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const DyingCraftingStationScreen: React.FunctionComponent<{
  stationEntityId?: BiomesId;
}> = ({}) => {
  return (
    <InventoryOverrideContextProvider>
      <SplitPaneScreen
        extraClassName="wardrobe"
        leftPaneExtraClassName={"biomes-box"}
        rightPaneExtraClassName={"biomes-box"}
      >
        <ScreenTitleBar title={"Dye-o-matic"} divider={false} />

        <RawLeftPane>
          <DyingCraftingStationLeftPane />
        </RawLeftPane>

        <RawRightPane>
          <SelfInventoryRightPane />
        </RawRightPane>
      </SplitPaneScreen>
    </InventoryOverrideContextProvider>
  );
};
