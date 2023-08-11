import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  eagerInventoryCombine,
  eagerInventorySplit,
  eagerInventorySwap,
  useOwnedItems,
} from "@/client/components/inventory/helpers";
import type { ClickPointType } from "@/client/components/inventory/InventoryAltClickContext";
import { InventoryAltClickContext } from "@/client/components/inventory/InventoryAltClickContext";
import { InventoryAltClickUI } from "@/client/components/inventory/InventoryAltClickUI";
import { InventoryControllerContext } from "@/client/components/inventory/InventoryControllerContext";
import {
  InventoryDragger,
  InventoryDraggerContext,
} from "@/client/components/inventory/InventoryDragger";
import {
  InventoryOverrideContext,
  useCreateInventoryOverrideContext,
} from "@/client/components/inventory/InventoryOverrideContext";
import { CreateTooltipContext } from "@/client/components/system/Tooltipped";
import { throwInventoryItem } from "@/client/game/helpers/inventory";
import type { DragItem } from "@/client/util/drag_helpers";
import { Inventory, Wearing } from "@/shared/ecs/gen/components";
import { OverflowMoveToInventoryEvent } from "@/shared/ecs/gen/events";
import type {
  ItemAndCount,
  ItemSlot,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import {
  findSlotToMergeIntoInventory,
  getMaxCombinable,
  getSlotByRef,
  isCombinableItems,
  OwnedItemReferencesEqual,
  patternAsSingleRef,
} from "@/shared/game/inventory";
import { isItemEqual } from "@/shared/game/item";
import { createBag, equalItems } from "@/shared/game/items";
import { isPlayer } from "@/shared/game/players";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { bigIntMin } from "@/shared/util/bigint";
import { ok } from "assert";
import type { PropsWithChildren } from "react";
import React, { useCallback, useState } from "react";

export const INVENTORY_COLS = 8;
const EJECT_ITEM_KEY = "x";

export const InventoryController: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const clientContext = useClientContext();
  const { requestBatchers, reactResources, events, userId, table } =
    clientContext;
  const localPlayer = reactResources.get("/scene/local_player");
  const ownedItems = useOwnedItems(reactResources, userId);
  const inventory = ownedItems.inventory ?? Inventory.create({});
  const wearing = ownedItems.wearing ?? Wearing.create({});
  const appearance = reactResources.use("/ecs/c/appearance_component", userId);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const overrideContext = useCreateInventoryOverrideContext();
  const [dragItemClass, setDragItemClass] = useState<string | undefined>();
  const [showAltClickUIForSlotRef, setShowAltClickUIForSlotRef] = useState<
    OwnedItemReference | undefined
  >();
  const [holdingShift, setHoldingShift] = useState(false);
  const [altClickUIClickPoint, setAltClickUIClickPoint] = useState<
    ClickPointType | undefined
  >();
  const [altClickUIEntityId, setAltClickUIEntityId] = useState<
    BiomesId | undefined
  >();
  const [altClickUISlot, setAltClickUISlot] = useState<ItemSlot>();

  // Throw one item out of the inventory slot.
  const ejectInventoryItems = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      itemAndCount: ItemAndCount,
      ejectCount: bigint
    ) => {
      if (!itemAndCount.item.isDroppable) {
        return;
      }
      fireAndForget(
        throwInventoryItem(clientContext, entityId, slotReference, ejectCount)
      );
    },
    []
  );

  const handleInventorySlotKeyPress = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot,
      ev: KeyboardEvent
    ) => {
      if (ev.key === EJECT_ITEM_KEY) {
        // Eject item from inventory.
        const hasItemToEject = slot !== undefined;
        if (hasItemToEject) {
          ejectInventoryItems(entityId, slotReference, slot, 1n);
        }
      }
    },
    []
  );

  const handleInventorySlotAltClick = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot,
      ev: React.MouseEvent
    ) => {
      if (
        !slot ||
        (showAltClickUIForSlotRef &&
          OwnedItemReferencesEqual(slotReference, showAltClickUIForSlotRef))
      ) {
        setShowAltClickUIForSlotRef(undefined);
        return;
      }

      const fromSlot = slot;
      setAltClickUIClickPoint(ev);
      setAltClickUISlot(fromSlot);
      setAltClickUIEntityId(entityId);
      setHoldingShift(ev.shiftKey);
      setShowAltClickUIForSlotRef(slotReference);
    },
    [dragItem, showAltClickUIForSlotRef, inventory, wearing]
  );

  const handleInventorySlotCtrlClick = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot | undefined,
      _: React.MouseEvent
    ) => {
      if (!slot) {
        return;
      }

      ejectInventoryItems(entityId, slotReference, slot, slot.count);
    },
    []
  );

  const handleInventorySlotMouseOver = useCallback(
    (
      _entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot,
      _ev: React.MouseEvent
    ) => {
      if (!wearing) {
        // You're not wearing anything at all.
        return;
      }
      if (!slot || slotReference.kind === "wearable") {
        // No need to warmup what you're already wearing.
        return;
      }
      const itemWearableSlot = findItemEquippableSlot(slot.item);
      if (
        !itemWearableSlot ||
        isItemEqual(slot?.item, wearing.items.get(itemWearableSlot))
      ) {
        return;
      }
      const assignment = new Map(wearing.items);
      assignment.set(itemWearableSlot, slot.item);
      fireAndForget(
        requestBatchers.playerMeshWarmer.fetch(
          assignment,
          appearance?.appearance
        )
      );
    },
    [appearance, wearing]
  );

  const handleInventorySlotDoubleClick = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot,
      _: React.MouseEvent
    ) => {
      // Double click behavior: Equip/unequip items.
      // Wearables go between wearable slots and inventory slots
      // Other items go between hotbar and non-hotbar inventory slots
      // (Potentially in the future make a helper equip/unequip to share logic?)
      if (!slot) {
        return;
      }

      // Don't allow double-blick for storage container slots.
      if (entityId !== localPlayer.id) {
        return;
      }

      // Find the spot to move to.
      let targetSlotRef: OwnedItemReference | undefined;
      const itemWearableSlot = findItemEquippableSlot(slot.item);
      if (itemWearableSlot) {
        // Clicked on a wearable. Go to/from wearables.
        if (slotReference.kind === "wearable") {
          // Equipped wearable. Go to inventory.
          targetSlotRef = patternAsSingleRef(
            findSlotToMergeIntoInventory(
              {
                inventory,
              },
              slot,
              {}
            )
          );
        } else {
          // Unequipped wearable. Go to the appropriate wearable slot.
          targetSlotRef = {
            kind: "wearable",
            key: itemWearableSlot,
          };
        }
      } else if (slotReference.kind === "hotbar") {
        // Hotbar -> inventory.
        targetSlotRef = patternAsSingleRef(
          findSlotToMergeIntoInventory(
            {
              inventory,
            },
            slot,
            {
              noHotbar: true,
            }
          )
        );
      } else if (slotReference.kind === "item") {
        // Inventory -> hotbar.
        targetSlotRef = patternAsSingleRef(
          findSlotToMergeIntoInventory(
            {
              inventory,
            },
            slot,
            {
              noInventory: true,
            }
          )
        );
      }

      if (targetSlotRef) {
        // We have a target. Determine if we want to swap or combine
        const targetSlot = getSlotByRef({ inventory, wearing }, targetSlotRef);
        if (targetSlotRef.kind === "wearable") {
          // If we're a wearable, and we're swapping with something,
          // we should be swapping with a wearable of the appropriate slot.
          ok(findItemEquippableSlot(slot.item, [targetSlotRef.key]));
          eagerInventorySwap(clientContext, overrideContext, {
            src: slotReference,
            dst: targetSlotRef,
          });
        } else if (
          targetSlot &&
          isCombinableItems({ from: slot, to: targetSlot })
        ) {
          // Combine if combinable and going to the inventory!
          eagerInventoryCombine(clientContext, overrideContext, {
            src: slotReference,
            dst: targetSlotRef,
            quantity: slot.count,
          });
        } else {
          eagerInventorySwap(clientContext, overrideContext, {
            src: slotReference,
            dst: targetSlotRef,
          });
        }
      }
    },
    [inventory, wearing, overrideContext]
  );

  const handleInventorySlotClick = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot,
      ev: React.MouseEvent,
      disabled: boolean
    ) => {
      if (disabled) {
        setDragItem(null);
        return;
      }

      if (ev.button !== 0) {
        return handleInventorySlotAltClick(entityId, slotReference, slot, ev);
      } else if (ev.ctrlKey) {
        return handleInventorySlotCtrlClick(entityId, slotReference, slot, ev);
      }

      const holdingItem = dragItem !== null;
      if (ev.detail >= 2 && ev.type == "mouseup" && holdingItem) {
        // Since double/triple clicks go through single clicks,
        // we'll have a drag item already set from the first click.
        // Clear it before doing double click logic
        setDragItem(null);
        handleInventorySlotDoubleClick(entityId, slotReference, slot, ev);
        return;
      }

      setShowAltClickUIForSlotRef(undefined);
      dragItem?.slotDropCallback?.(slotReference, slot);
      if (!dragItem) {
        if (slot) {
          setDragItem({
            kind: "inventory_drag",
            entityId,
            slot,
            slotReference,
            clickOrigin: ev,
            quantity: slot.count,
          });
        }
        return;
      }

      if (dragItem.kind === "inventory_overflow") {
        if (dragItem.item && slot === undefined) {
          fireAndForget(
            events.publish(
              new OverflowMoveToInventoryEvent({
                id: entityId,
                payload: createBag(dragItem.item),
                dst: slotReference,
              })
            )
          );
        }
        setDragItem(null);
        return;
      }

      if (dragItem.kind !== "inventory_drag") {
        return;
      }

      const fromRef = dragItem.slotReference;
      const fromEntityId = dragItem.entityId;
      const fromSlot = dragItem.slot;
      const toRef = slotReference;
      const toEntityId = entityId;
      const toEntity = table.get(toEntityId);
      const toIsPlayer = toEntity && isPlayer(toEntity);
      const toSlot = slot;
      const isCurrency = dragItem.slot?.item.isCurrency;

      if (
        fromEntityId === toEntityId &&
        OwnedItemReferencesEqual(fromRef, toRef)
      ) {
        setDragItem(null);
        return;
      }

      if (!fromSlot) {
        setDragItem(null);
        return;
      }

      if (
        toRef.kind === "wearable" &&
        !findItemEquippableSlot(fromSlot?.item, [toRef.key])
      ) {
        setDragItem(null);
        return;
      } else if (isCurrency && toIsPlayer && toRef.kind !== "currency") {
        setDragItem(null);
        return;
      }

      if (
        toSlot === undefined &&
        dragItem.quantity !== undefined &&
        fromSlot.count > dragItem.quantity
      ) {
        eagerInventorySplit(clientContext, overrideContext, {
          src: fromRef,
          dst: toRef,
          dstEntityId: toEntityId,
          srcEntityId: fromEntityId,
          quantity: dragItem.quantity,
        });
      } else if (fromSlot && toSlot && equalItems(fromSlot.item, toSlot.item)) {
        // Combine like items.
        const availableFromSource = dragItem.quantity ?? fromSlot.count ?? 0n;
        const availableInReceivingStack = getMaxCombinable({
          from: fromSlot,
          to: toSlot,
          count: dragItem.quantity,
        });
        const maxCombinable = bigIntMin(
          availableFromSource,
          availableInReceivingStack
        );

        if (maxCombinable === 0n) {
          // "To stack" is already full. Do swap.
          eagerInventorySwap(clientContext, overrideContext, {
            src: fromRef,
            dst: toRef,
            srcEntityId: fromEntityId,
            dstEntityId: toEntityId,
          });
        } else {
          // Fill the "to stack" with the "from stack".
          // TODO(devin): keep holding the "from stack" if any items are remaining.
          eagerInventoryCombine(clientContext, overrideContext, {
            src: fromRef,
            dst: toRef,
            srcEntityId: fromEntityId,
            dstEntityId: toEntityId,
            quantity: maxCombinable,
          });
        }
      } else {
        eagerInventorySwap(clientContext, overrideContext, {
          src: fromRef,
          dst: toRef,
          srcEntityId: fromEntityId,
          dstEntityId: toEntityId,
        });
      }

      setDragItem(null);
    },
    [
      dragItem,
      inventory,
      wearing,
      overrideContext,
      handleInventorySlotAltClick,
      handleInventorySlotCtrlClick,
      handleInventorySlotDoubleClick,
    ]
  );

  const handleAvatarClick = useCallback(() => {
    if (!dragItem || dragItem.kind !== "inventory_drag" || !dragItem.slot) {
      return false;
    }

    const itemWearableSlot = findItemEquippableSlot(dragItem.slot.item);
    if (!itemWearableSlot) {
      return false;
    }

    const targetSlotRef = {
      kind: "wearable" as const,
      key: itemWearableSlot,
    };
    // If we're a wearable, and we're swapping with something,
    // we should be swapping with a wearable of the appropriate slot.
    eagerInventorySwap(clientContext, overrideContext, {
      src: dragItem.slotReference,
      dst: targetSlotRef,
    });
    setDragItem(null);
    return true;
  }, [dragItem, overrideContext]);

  const handleDraggerMove = useCallback(
    (x: number, y: number) => {
      // I'm not a huge fan of this, but onMouseMove events aren't properly captured by the poof area.
      // Traverse down the elements our mouse is over, and if we hit a mini-phone or hot-bar before
      // we hit poof-area, that means we're not in a poof area.
      let hoveringPoof = true;
      for (const elem of document.elementsFromPoint(x, y)) {
        const classes = new Set(elem.classList);
        if (classes.has("mini-phone") || classes.has("hot-bar")) {
          hoveringPoof = false;
        } else if (classes.has("modal")) {
          break;
        }
      }
      setDragItemClass(hoveringPoof ? "poof" : undefined);
    },
    [dragItemClass]
  );

  if (!inventory) {
    return <></>;
  }

  return (
    <InventoryOverrideContext.Provider value={overrideContext}>
      <CreateTooltipContext>
        <InventoryControllerContext.Provider
          value={{
            handleInventorySlotMouseOver,
            handleInventorySlotClick,
            handleAvatarClick,
            handleInventorySlotKeyPress,
          }}
        >
          <InventoryAltClickContext.Provider
            value={{
              altClickUIEntityId: altClickUIEntityId,
              altClickUISlot: altClickUISlot,
              showAltClickUIForSlotRef: showAltClickUIForSlotRef,
              setAltClickUIForSlotRef: setShowAltClickUIForSlotRef,
              altClickUIClickPoint,
            }}
          >
            <InventoryDraggerContext.Provider value={{ dragItem, setDragItem }}>
              <InventoryDragger
                onDrag={handleDraggerMove}
                extraClasses={dragItemClass ? [dragItemClass] : []}
              >
                {dragItem && dragItemClass && (
                  <div className="poof-label tooltip-content">Drop</div>
                )}
              </InventoryDragger>

              {showAltClickUIForSlotRef && (
                <InventoryAltClickUI shiftKeyDown={holdingShift} />
              )}

              {children}
            </InventoryDraggerContext.Provider>
          </InventoryAltClickContext.Provider>
        </InventoryControllerContext.Provider>
      </CreateTooltipContext>
    </InventoryOverrideContext.Provider>
  );
};
