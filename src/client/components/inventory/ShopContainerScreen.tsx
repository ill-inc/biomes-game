import { AvatarView } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { ClientSideContainerItem } from "@/client/components/inventory/client_side_container";
import { useClientSideContainer } from "@/client/components/inventory/client_side_container";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { InventoryOverrideContextProvider } from "@/client/components/inventory/InventoryOverrideContext";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import type { OpenContainer } from "@/client/components/inventory/types";
import { CurrencyWithGlyph } from "@/client/components/system/CurrencyWithGlyph";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogSlider } from "@/client/components/system/DialogSlider";
import { MiniPhoneActionSheetActions } from "@/client/components/system/mini_phone/MiniPhoneActionSheet";
import { MiniPhoneMoreItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import { BikkieIds } from "@/shared/bikkie/ids";
import {
  AdminSetInfiniteCapacityContainerEvent,
  PurchaseFromContainerEvent,
  SellInContainerEvent,
} from "@/shared/ecs/gen/events";
import { currencyBalance, maybeGetSlotByRef } from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { fireAndForget } from "@/shared/util/async";
import { rowMajorIdx } from "@/shared/util/helpers";
import { ok } from "assert";
import { compact, range } from "lodash";
import type { PropsWithChildren } from "react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface WantToBuyItem {
  containerSlotIdx: number;
}

export const ShopContainerLeftPaneContent: React.FunctionComponent<{
  openContainer: OpenContainer;
}> = ({ openContainer }) => {
  const { socialManager, reactResources, events, userId } = useClientContext();
  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const [containerInventory, placedBy, inventory, wearing] =
    reactResources.useAll(
      ["/ecs/c/priced_container_inventory", openContainer.containerId],
      ["/ecs/c/placed_by", openContainer.containerId],
      ["/ecs/c/inventory", userId],
      ["/ecs/c/wearing", userId]
    );

  ok(containerInventory);
  const owner = useCachedUserInfo(socialManager, placedBy?.id);
  const clientSideContainer = useClientSideContainer(
    containerInventory.items.length
  );

  const [wantToSellPriceInput, setWantToSellPriceInput] = useState<string>("");

  const [wantToBuy, setWantToBuy] = useState<WantToBuyItem | undefined>();
  const [buyText, setBuyText] = useState("Buy");
  const [disableBuyButton, setDisableBuyButton] = useState(false);
  // Number of times to execute the purchase.
  const [purchaseCount, setPurchaseCount] = useState<number>(1);

  const serverFilledSlots = compact(containerInventory.items).length;
  const clientFilledClots = compact(clientSideContainer.slots).length;

  const isMyStorageContainer = placedBy?.id === userId;

  const numItems = containerInventory.items.length;
  const numCols = anItem(openContainer.itemId).numCols || 1;
  const derivedNumRows = Math.ceil(numItems / numCols);
  const priceField = useRef<HTMLInputElement>(null);
  const isAdminShop = containerInventory.infinite_capacity;

  const mode =
    isMyStorageContainer && serverFilledSlots === 0 ? "place_into" : "buy";

  const handleShopCellClick = useCallback(
    (slotIdx: number) => {
      if (!dragItem && clientSideContainer.slots[slotIdx]) {
        const surrogateItem = clientSideContainer.slots[slotIdx];
        if (surrogateItem) {
          setDragItem({
            kind: "ephemeral",
            item: surrogateItem.item,
            quantity: surrogateItem.quantity,
            slotDropCallback: () => {
              clientSideContainer.setSlotAtIndex(slotIdx, undefined);
              setDragItem(null);
            },
          });
        }
        return;
      } else if (dragItem?.kind === "inventory_drag") {
        if (dragItem.kind === "inventory_drag") {
          const item = maybeGetSlotByRef(
            { inventory, wearing },
            dragItem.slotReference
          );
          if (item) {
            clientSideContainer.setSlotAtIndex(slotIdx, {
              refSlot: dragItem.slotReference,
              quantity: dragItem.quantity,
            });
          }
          setDragItem(null);
        }
      }
    },
    [
      mode,
      dragItem,
      containerInventory,
      clientSideContainer,
      inventory,
      wearing,
    ]
  );

  const handleListForSale = useCallback(
    (item: ClientSideContainerItem, price: number) => {
      fireAndForget(
        events.publish(
          new SellInContainerEvent({
            id: openContainer.containerId,
            src: item.refSlot,
            seller_id: userId,
            sell_item: item.item,
            dst_price: countOf(BikkieIds.bling, BigInt(Math.floor(price))),
            dst_slot: {
              kind: "item",
              idx: 0,
            },
          })
        )
      );
    },
    []
  );

  const handleBuy = useCallback(
    (item: WantToBuyItem) => {
      const containerItem = containerInventory.items[item.containerSlotIdx];
      if (!containerItem) {
        return;
      }

      fireAndForget(
        events.publish(
          new PurchaseFromContainerEvent({
            id: openContainer.containerId,
            src: {
              kind: "item",
              idx: item.containerSlotIdx,
            },
            purchaser_id: userId,
            seller_id: containerItem?.seller_id,
            quantity: purchaseCount,
          })
        )
      );
      setBuyText("Added to Inventory");
      setDisableBuyButton(true);
      setTimeout(() => {
        setBuyText("Buy");
        setDisableBuyButton(false);
      }, 2000);
    },
    [containerInventory, purchaseCount]
  );

  useEffect(() => {
    if (numItems === 1) {
      setWantToBuy({ containerSlotIdx: 0 });
    }
  }, [containerInventory]);

  // Total cost of a purchase, accounting for the purchaseCount.
  // Returns undefined if no item is selected for purchase.
  const costOfPurchase = useMemo<number>(() => {
    if (!wantToBuy || !containerInventory) {
      return 0;
    }
    const itemCost =
      containerInventory.items[wantToBuy.containerSlotIdx]?.price.count;
    if (!itemCost) {
      return 0;
    }

    return Number(itemCost) * purchaseCount;
  }, [wantToBuy, containerInventory, purchaseCount]);

  const cannotBuyReason = useMemo(() => {
    if (!wantToBuy) {
      return "No item to buy";
    }

    if (!containerInventory.items[wantToBuy.containerSlotIdx]) {
      return "No item available for sale";
    }
    if (!inventory) {
      return "Your inventory is full";
    }

    if (currencyBalance(inventory, BikkieIds.bling) < costOfPurchase) {
      return "You don't have enough Bling";
    }
  }, [inventory, wantToBuy, containerInventory, costOfPurchase]);

  const ItemDescription: React.FC<{
    name: string;
    price: number;
    description: string;
  }> = ({ name, price, description }) => {
    const totalPrice = price * purchaseCount;
    if (purchaseCount !== 1) {
      name += ` (${purchaseCount}x)`;
    }
    return (
      <>
        <div className="cell-tooltip">{name}</div>
        <div className={`tertiary-label price`}>
          <CurrencyWithGlyph
            itemAndCount={countOf(BikkieIds.bling, BigInt(totalPrice))}
          />
        </div>

        <div className="secondary-label">{description}</div>
      </>
    );
  };

  return (
    <PaneLayout extraClassName="inventory-left-pane shop">
      <div className="padded-view">
        <div className="shop-name">
          {placedBy && <AvatarView userId={placedBy?.id} />}
          {owner?.user.username}&apos;s Shop
        </div>
        <div className="inventory-cells">
          {range(derivedNumRows).map((row) => (
            <React.Fragment key={`row${row}`}>
              {range(numCols).map((col) => {
                const slotIdx = rowMajorIdx(numCols, row, col);
                if (mode === "place_into") {
                  const item = clientSideContainer.slots[slotIdx];
                  return (
                    <div
                      className="shop-item-details"
                      key={`item-details-${slotIdx}`}
                    >
                      <NormalSlotWithTooltip
                        entityId={openContainer.containerId}
                        slot={item?.item}
                        slotReference={{
                          kind: "item",
                          idx: slotIdx,
                        }}
                        onClick={() => handleShopCellClick(slotIdx)}
                      />
                    </div>
                  );
                } else {
                  const item = containerInventory?.items[slotIdx];
                  return (
                    <div
                      className="shop-item-details"
                      key={`item-details-${slotIdx}`}
                    >
                      <NormalSlotWithTooltip
                        entityId={openContainer.containerId}
                        slot={item?.contents}
                        slotReference={{
                          kind: "item",
                          idx: slotIdx,
                        }}
                      />
                      {item && (
                        <ItemDescription
                          name={item.contents.item.displayName}
                          description={
                            item.contents.item.displayDescription ?? ""
                          }
                          price={Number(item?.price.count ?? 0n)}
                        />
                      )}
                    </div>
                  );
                }
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {mode === "place_into" && clientFilledClots === 0 && (
        <PaneBottomDock>
          <div className="drag-teaser">Drag item from Inventory to sell</div>
        </PaneBottomDock>
      )}

      {mode === "place_into" && clientFilledClots > 0 && (
        <PaneBottomDock>
          <div className="slot-shop-set-price">
            <input
              ref={priceField}
              type="number"
              placeholder="Price"
              value={wantToSellPriceInput}
              onChange={(e) => {
                setWantToSellPriceInput(e.target.value);
              }}
            />
          </div>
          <MiniPhoneActionSheetActions>
            <DialogButton
              disabled={isNaN(parseFloat(wantToSellPriceInput))}
              type="primary"
              onClick={() => {
                const item = clientSideContainer.slots[0];
                if (item) {
                  handleListForSale(item, parseFloat(wantToSellPriceInput));
                }
              }}
            >
              List for Sale
            </DialogButton>
          </MiniPhoneActionSheetActions>
        </PaneBottomDock>
      )}

      {mode === "buy" && serverFilledSlots > 0 && (
        <PaneBottomDock>
          {isAdminShop && (
            <div className="mb-1 flex">
              <div className={`tertiary-label`}>{`Quantity`}</div>
              <DialogSlider
                extraClassNames="w-full pl-1"
                min={1}
                max={20}
                value={purchaseCount}
                onChange={(value) => setPurchaseCount(value)}
                showValue={true}
              />
            </div>
          )}
          <Tooltipped tooltip={cannotBuyReason}>
            <DialogButton
              disabled={
                !isMyStorageContainer &&
                (disableBuyButton ||
                  !wantToBuy ||
                  !inventory ||
                  !containerInventory.items[wantToBuy.containerSlotIdx] ||
                  currencyBalance(inventory, BikkieIds.bling) < costOfPurchase)
              }
              onClick={() => {
                handleBuy(wantToBuy!);
              }}
              type={isMyStorageContainer ? undefined : "primary"}
            >
              {isMyStorageContainer ? "Remove from Sale" : buyText}
            </DialogButton>
          </Tooltipped>
        </PaneBottomDock>
      )}
    </PaneLayout>
  );
};

export const ShopContainerScreen: React.FunctionComponent<
  PropsWithChildren<{
    openContainer: OpenContainer;
  }>
> = ({ openContainer, children }) => {
  const { authManager, reactResources, events, gardenHose, userId } =
    useClientContext();
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    gardenHose.publish({
      kind: "open_shop",
    });

    return () => {
      gardenHose.publish({
        kind: "close_shop",
      });
    };
  }, []);

  const [containerInventory, placedBy] = reactResources.useAll(
    ["/ecs/c/priced_container_inventory", openContainer.containerId],
    ["/ecs/c/placed_by", openContainer.containerId]
  );

  const isAdmin = authManager.currentUser.hasSpecialRole("admin");
  const isMyStorageContainer = placedBy?.id === userId;

  const moreItems: MoreMenuItem[] = [
    {
      label: containerInventory?.infinite_capacity
        ? "Unset Infinite Capacity"
        : "Set infinite capacity",
      type: "destructive",
      onClick: () => {
        setShowMore(false);
        fireAndForget(
          events.publish(
            new AdminSetInfiniteCapacityContainerEvent({
              id: openContainer.containerId,
              infinite_capacity: !containerInventory?.infinite_capacity,
            })
          )
        );
      },
    },
    {
      label: "Copy Shop ID",
      onClick: () => {
        setShowMore(false);
        void navigator.clipboard.writeText(String(openContainer.containerId));
      },
    },
  ];

  return (
    <InventoryOverrideContextProvider>
      <SplitPaneScreen
        extraClassName="profile"
        leftPaneExtraClassName="biomes-box"
        rightPaneExtraClassName="biomes-box"
      >
        <ScreenTitleBar title={" "} divider={false}>
          <RightBarItem>
            {isAdmin && isMyStorageContainer && (
              <>
                <MiniPhoneMoreItem
                  onClick={() => {
                    setShowMore(!showMore);
                  }}
                />
                <MoreMenu
                  items={moreItems}
                  showing={showMore}
                  setShowing={setShowMore}
                />
              </>
            )}
          </RightBarItem>
        </ScreenTitleBar>
        <RawLeftPane>
          <ShopContainerLeftPaneContent openContainer={openContainer} />
        </RawLeftPane>
        <RawRightPane>
          <SelfInventoryRightPane>{children}</SelfInventoryRightPane>
        </RawRightPane>
      </SplitPaneScreen>
    </InventoryOverrideContextProvider>
  );
};
