import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import {
  ownedItemVersions,
  useOwnedItems,
} from "@/client/components/inventory/helpers";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import {
  InventoryOverrideContextProvider,
  useInventoryOverrideContext,
} from "@/client/components/inventory/InventoryOverrideContext";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { DialogButton } from "@/client/components/system/DialogButton";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import {
  AcceptTradeEvent,
  ChangeTradeOfferEvent,
} from "@/shared/ecs/gen/events";
import type { ReadonlyInventoryAssignmentPattern } from "@/shared/ecs/gen/types";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";

import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { rowMajorIdx } from "@/shared/util/helpers";
import { compact, range } from "lodash";
import type { PropsWithChildren } from "react";
import React, { useCallback, useEffect } from "react";

const ItemBuyerLeftPaneContent: React.FunctionComponent<{
  tradeId: BiomesId;
}> = ({ tradeId }) => {
  const { socialManager, userId, events, reactResources } = useClientContext();
  const numItems = 9;
  const numCols = 3;
  const derivedNumRows = Math.ceil(numItems / numCols);
  const [trade] = useLatestAvailableComponents(tradeId, "trade");
  const { dragItem, setDragItem } = useInventoryDraggerContext();

  const miniphone = useExistingMiniPhoneContext();

  const inventoryOverrides = useInventoryOverrideContext();

  const meTrader =
    trade?.trader1.id === userId ? trade?.trader1 : trade?.trader2;
  const otherTrader =
    trade?.trader1.id === userId ? trade?.trader2 : trade?.trader1;
  const otherTraderUser = useCachedUserInfo(socialManager, otherTrader?.id);
  const meUser = useCachedUserInfo(socialManager, meTrader?.id);

  const ownedItems = useOwnedItems(reactResources, userId);
  const myOfferAssignment: Array<
    ReadonlyInventoryAssignmentPattern[number] | undefined
  > = [...(meTrader?.offer_assignment ?? [])];
  for (let i = myOfferAssignment.length; i < numItems; i++) {
    myOfferAssignment.push(undefined);
  }

  const theirOfferAssignment: Array<
    ReadonlyInventoryAssignmentPattern[number] | undefined
  > = [...(otherTrader?.offer_assignment ?? [])];
  const handleMyTradeCellClick = useCallback(
    (slotIdx: number) => {
      if (!dragItem && myOfferAssignment?.[slotIdx]) {
        const [ref, surrogateItem] = myOfferAssignment?.[slotIdx] ?? [
          undefined,
          undefined,
        ];
        if (surrogateItem) {
          setDragItem({
            kind: "ephemeral",
            item: surrogateItem,
            quantity: surrogateItem.count,
            slotDropCallback: () => {
              const offerCopy = [...myOfferAssignment];
              offerCopy[slotIdx] = undefined;
              inventoryOverrides.removeInventoryOverride(ref);
              fireAndForget(
                events.publish(
                  new ChangeTradeOfferEvent({
                    id: userId,
                    trade_id: tradeId,
                    offer: compact(offerCopy),
                  })
                )
              );
              setDragItem(null);
            },
          });
        }
        return;
      } else if (dragItem?.kind === "inventory_drag") {
        if (dragItem.kind === "inventory_drag") {
          const item = maybeGetSlotByRef(ownedItems, dragItem.slotReference);
          const offerCopy = [...myOfferAssignment];
          if (item) {
            offerCopy[slotIdx] = [
              dragItem.slotReference,
              countOf(item.item, dragItem.quantity ?? item.count),
            ];
            inventoryOverrides.combineInventoryOverride({
              ref: dragItem.slotReference,
              delta: dragItem.quantity ?? item.count,
              item: item.item,
            });
            fireAndForget(
              events.publish(
                new ChangeTradeOfferEvent({
                  id: userId,
                  trade_id: tradeId,
                  offer: compact(offerCopy),
                })
              )
            );
          }
          setDragItem(null);
        }
      }
    },
    [
      dragItem,
      trade,
      myOfferAssignment?.length,
      ownedItemVersions(reactResources, userId),
    ]
  );

  useEffect(() => {
    let needsUpdate = false;
    const newOfer: typeof myOfferAssignment = [];
    for (const assign of myOfferAssignment) {
      if (assign) {
        const [ref, expectedItem] = assign;
        const item = maybeGetSlotByRef(ownedItems, ref);
        if (item?.item.id !== expectedItem.item.id) {
          needsUpdate = true;
        } else {
          newOfer.push([...assign]);
        }
      }
    }

    if (needsUpdate) {
      fireAndForget(
        events.publish(
          new ChangeTradeOfferEvent({
            id: userId,
            trade_id: tradeId,
            offer: compact(newOfer),
          })
        )
      );
    }
  }, [
    trade,
    myOfferAssignment?.length,
    ownedItemVersions(reactResources, userId),
  ]);

  useEffect(() => {
    if (meTrader?.accepted && otherTrader?.accepted) {
      miniphone?.close();
    }
  }, [meTrader?.accepted, otherTrader?.accepted]);

  if (trade === undefined) {
    <PaneLayout extraClassName="inventory-left-pane ">
      Loading trade...
    </PaneLayout>;
  } else if (trade === null) {
    <PaneLayout extraClassName="inventory-left-pane ">
      Trade not found!
    </PaneLayout>;
  }

  return (
    <PaneLayout extraClassName="inventory-left-pane ">
      <div className="padded-view">
        {otherTrader?.accepted ? (
          <div>{otherTraderUser?.user.username} accepted the offer</div>
        ) : (
          <div>{otherTraderUser?.user.username} offers</div>
        )}
        <div className="inventory-cells">
          {range(derivedNumRows).map((row) => (
            <React.Fragment key={`row${row}`}>
              {range(numCols).map((col) => {
                const slotIdx = rowMajorIdx(numCols, row, col);
                const item = theirOfferAssignment[slotIdx]?.[1];
                return (
                  <div key={`other-details-${slotIdx}`}>
                    <NormalSlotWithTooltip
                      entityId={otherTrader?.id ?? INVALID_BIOMES_ID}
                      slot={item}
                      slotReference={{
                        kind: "item",
                        idx: slotIdx,
                      }}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {meTrader?.accepted ? (
          <div>{meUser?.user.username} accepted the trade </div>
        ) : (
          <div>{meUser?.user.username} offers</div>
        )}
        <div className="inventory-cells">
          {range(derivedNumRows).map((row) => (
            <React.Fragment key={`row${row}`}>
              {range(numCols).map((col) => {
                const slotIdx = rowMajorIdx(numCols, row, col);
                const [ref, item] = myOfferAssignment?.[slotIdx] ?? [
                  undefined,
                  undefined,
                ];
                return (
                  <div key={`my-details-${slotIdx}`}>
                    <NormalSlotWithTooltip
                      entityId={userId}
                      slot={item}
                      slotReference={
                        ref ?? {
                          kind: "item",
                          idx: slotIdx,
                        }
                      }
                      onClick={() => handleMyTradeCellClick(slotIdx)}
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
          disabled={meTrader?.accepted}
          onClick={() => {
            fireAndForget(
              events.publish(
                new AcceptTradeEvent({
                  id: userId,
                  trade_id: tradeId,
                  other_trader_id: otherTrader?.id,
                })
              )
            );
          }}
          type="primary"
        >
          Accept Trade
        </DialogButton>
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const TradeScreen: React.FunctionComponent<
  PropsWithChildren<{
    tradeId: BiomesId;
  }>
> = ({ tradeId, children }) => {
  return (
    <InventoryOverrideContextProvider>
      <SplitPaneScreen
        extraClassName="profile"
        leftPaneExtraClassName="biomes-box"
        rightPaneExtraClassName="biomes-box"
      >
        <ScreenTitleBar title={"Trade"} />
        <RawLeftPane>
          <ItemBuyerLeftPaneContent tradeId={tradeId} />
        </RawLeftPane>
        <RawRightPane>
          <SelfInventoryRightPane>{children}</SelfInventoryRightPane>
        </RawRightPane>
      </SplitPaneScreen>
    </InventoryOverrideContextProvider>
  );
};
