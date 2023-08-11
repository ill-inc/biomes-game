import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useClientSideContainer } from "@/client/components/inventory/client_side_container";
import { useOwnedItems } from "@/client/components/inventory/helpers";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { InventoryOverrideContextProvider } from "@/client/components/inventory/InventoryOverrideContext";
import type { TooltipFlair } from "@/client/components/inventory/InventoryViewContext";
import { InventoryViewContext } from "@/client/components/inventory/InventoryViewContext";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { CurrencyWithGlyph } from "@/client/components/system/CurrencyWithGlyph";
import { DialogButton } from "@/client/components/system/DialogButton";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { BikkieIds } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { SellToEntityEvent } from "@/shared/ecs/gen/events";
import type {
  InventoryAssignmentPattern,
  ItemAndCount,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import { resolveItemAttributeId } from "@/shared/game/item";
import { countOf, createBag } from "@/shared/game/items";
import { bagSellPrice, isSellable, unitSellPrice } from "@/shared/game/sales";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { rowMajorIdx } from "@/shared/util/helpers";
import { andify } from "@/shared/util/text";
import { range, startCase } from "lodash";
import pluralize from "pluralize";
import type { PropsWithChildren } from "react";
import React, { useCallback, useMemo } from "react";

const ItemBuyerLeftPaneContent: React.FunctionComponent<{
  entityId: BiomesId;
}> = ({ entityId }) => {
  const { reactResources, events, userId } = useClientContext();
  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const ownedItems = useOwnedItems(reactResources, userId);

  const numItems = 12;
  const numCols = 3;
  const derivedNumRows = Math.ceil(numItems / numCols);
  const clientSideContainer = useClientSideContainer(numItems);
  const itemBuyer = reactResources.use("/ecs/c/item_buyer", entityId);

  const friendlyBuyerStrings = itemBuyer?.attribute_ids
    .map((attribute) =>
      pluralize(startCase(attribs.byId.get(attribute)?.name.replace(/^is/, "")))
    )
    .filter((attribute) => attribute != undefined);

  const friendlyBuyerString = friendlyBuyerStrings
    ? `I'm interested in ${andify(friendlyBuyerStrings)}`
    : undefined;

  const buyerString = itemBuyer?.buy_description ?? friendlyBuyerString;
  const entity = reactResources.use("/ecs/entity", entityId);

  const filledSlotAssignment = useMemo<InventoryAssignmentPattern>(
    () =>
      clientSideContainer.slots.flatMap((e) => {
        if (e && isSellable(e.item.item)) {
          return [[e.refSlot, e.item]] as Array<
            [OwnedItemReference, ItemAndCount]
          >;
        }
        return [];
      }),
    [clientSideContainer.slots, ownedItems]
  );

  const fillBag = useMemo(() => {
    return createBag(...filledSlotAssignment.map((e) => e[1]));
  }, [filledSlotAssignment]);

  const handleNpcBuyerCellClick = useCallback(
    (slotIdx: number) => {
      if (!dragItem && clientSideContainer.slots[slotIdx]) {
        const surrogateItem = clientSideContainer.slots[slotIdx];
        const item = maybeGetSlotByRef(ownedItems, surrogateItem?.refSlot);
        if (item && surrogateItem) {
          setDragItem({
            kind: "ephemeral",
            item: item,
            quantity: surrogateItem.quantity,
            slotDropCallback: () => {
              clientSideContainer.setSlotAtIndex(slotIdx, undefined);
              setDragItem(null);
            },
          });
        }
        return;
      } else if (dragItem) {
        if (dragItem.kind === "inventory_drag") {
          const item = maybeGetSlotByRef(ownedItems, dragItem.slotReference);
          if (item && isSellable(item.item)) {
            clientSideContainer.setSlotAtIndex(slotIdx, {
              refSlot: dragItem.slotReference,
              quantity: dragItem.quantity,
            });
          }
          setDragItem(null);
        }
      }
    },
    [dragItem, clientSideContainer, ownedItems]
  );

  const handleSell = useCallback(() => {
    const event = new SellToEntityEvent({
      id: entityId,
      seller_id: userId,
      purchaser_id: entityId,
      src: [...filledSlotAssignment],
    });
    fireAndForget(events.publish(event));
  }, [ownedItems, filledSlotAssignment, clientSideContainer]);

  const totalPrice = bagSellPrice(fillBag);

  return (
    <PaneLayout extraClassName="inventory-left-pane">
      <div className="padded-view">
        <div className="flex flex-col items-center gap-1 p-2">
          <EntityProfilePic entityId={entityId} />
          <div className="flex flex-col items-center gap-0.6">
            <div className="text-sm font-semibold text-secondary-gray">
              {entity?.label?.text}
            </div>
            <div className="text-center">{buyerString}</div>
          </div>
        </div>
        <div className="inventory-cells">
          {range(derivedNumRows).map((row) => (
            <React.Fragment key={`row${row}`}>
              {range(numCols).map((col) => {
                const slotIdx = rowMajorIdx(numCols, row, col);
                const itemRef = clientSideContainer.slots[slotIdx];
                return (
                  <div key={`item-details-${slotIdx}`}>
                    <NormalSlotWithTooltip
                      entityId={userId}
                      slot={itemRef?.item}
                      slotReference={{
                        kind: "item",
                        idx: slotIdx,
                      }}
                      onClick={() => handleNpcBuyerCellClick(slotIdx)}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <PaneBottomDock>
        <DialogButton
          disabled={filledSlotAssignment.length === 0}
          onClick={() => {
            handleSell();
          }}
          type="primary"
        >
          {totalPrice === 0n ? (
            <> Sell </>
          ) : (
            <>
              Sell for{" "}
              <CurrencyWithGlyph
                itemAndCount={countOf(BikkieIds.bling, totalPrice)}
              />
            </>
          )}
        </DialogButton>
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const ItemBuyerScreen: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
  }>
> = ({ entityId, children }) => {
  const { reactResources } = useClientContext();
  const itemBuyer = reactResources.use("/ecs/c/item_buyer", entityId);
  const disableSlotPredicate = (item: ItemAndCount | undefined) => {
    if (!item) {
      return false;
    }
    if (!isSellable(item.item)) {
      return true;
    }

    for (const attributeId of itemBuyer?.attribute_ids ?? []) {
      if (Boolean(resolveItemAttributeId(item.item, attributeId))) {
        return false;
      }
    }
    return true;
  };
  return (
    <InventoryOverrideContextProvider>
      <InventoryViewContext.Provider
        value={{
          tooltipFlairForItem(item): TooltipFlair[] {
            if (!isSellable(item.item)) {
              return [];
            }

            return [
              {
                kind: "sale",
                unitPrice: countOf(BikkieIds.bling, unitSellPrice(item.item)),
              },
            ];
          },
        }}
      >
        <SplitPaneScreen
          extraClassName="profile"
          leftPaneExtraClassName="biomes-box"
          rightPaneExtraClassName="biomes-box"
        >
          <ScreenTitleBar title={"Sell Items"} />
          <RawLeftPane>
            <ItemBuyerLeftPaneContent entityId={entityId} />
          </RawLeftPane>
          <RawRightPane>
            <SelfInventoryRightPane disableSlotPredicate={disableSlotPredicate}>
              {children}
            </SelfInventoryRightPane>
          </RawRightPane>
        </SplitPaneScreen>
      </InventoryViewContext.Provider>
    </InventoryOverrideContextProvider>
  );
};
