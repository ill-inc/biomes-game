import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ownedItemVersions,
  useOwnedItems,
} from "@/client/components/inventory/helpers";
import { useInventoryOverrideContext } from "@/client/components/inventory/InventoryOverrideContext";
import { useStateArray } from "@/client/util/hooks";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";
import type { ItemAndCount } from "@/shared/game/types";
import { ok } from "assert";
import { isEqual } from "lodash";
import { useCallback, useEffect } from "react";

export interface ClientSideContainerItemWithoutRefItem {
  refSlot: OwnedItemReference;
  quantity?: bigint;
}

export interface ClientSideContainerItem
  extends ClientSideContainerItemWithoutRefItem {
  refItem: ItemAndCount | undefined;
  item: ItemAndCount;
}

export interface ClientSideContainer {
  slots: Array<ClientSideContainerItem | undefined>;
  setSlotAtIndex: (
    idx: number,
    containerItem: ClientSideContainerItemWithoutRefItem | undefined
  ) => void;
  clear: () => void;
}

export function useClientSideContainer(numItems: number): ClientSideContainer {
  const { reactResources, userId } = useClientContext();
  const overrideContext = useInventoryOverrideContext();
  const ownedItems = useOwnedItems(reactResources, userId);
  const [surrogateInventory, setSurrogateInventoryItemAtIndex] = useStateArray(
    ([] as Array<ClientSideContainerItem | undefined>).fill(
      undefined,
      0,
      numItems
    )
  );

  const setSlotAtIndex = useCallback(
    (
      idx: number,
      containerItem: ClientSideContainerItemWithoutRefItem | undefined
    ) => {
      const existingItem = surrogateInventory[idx];
      if (existingItem) {
        overrideContext.combineInventoryOverride({
          ref: existingItem.refSlot,
          item: existingItem.item.item,
          delta: -existingItem.item.count,
        });
      }

      if (containerItem !== undefined) {
        const inventoryItem = maybeGetSlotByRef(
          ownedItems,
          containerItem.refSlot
        );
        ok(inventoryItem);
        overrideContext.combineInventoryOverride({
          ref: containerItem.refSlot,
          item: inventoryItem.item,
          delta: containerItem.quantity ?? inventoryItem.count,
        });
        setSurrogateInventoryItemAtIndex(idx, {
          ...containerItem,
          refItem: inventoryItem,
          item: countOf(inventoryItem.item, containerItem.quantity),
        });
      } else {
        setSurrogateInventoryItemAtIndex(idx, undefined);
      }
    },
    [surrogateInventory, ...ownedItemVersions(reactResources, userId)]
  );

  const clear = useCallback(() => {
    for (let i = 0; i < surrogateInventory.length; i += 1) {
      setSlotAtIndex(i, undefined);
    }
  }, [
    surrogateInventory,
    setSlotAtIndex,
    ...ownedItemVersions(reactResources, userId),
  ]);

  useEffect(() => {
    for (let i = 0; i < surrogateInventory.length; i += 1) {
      const containerItem = surrogateInventory[i];
      if (containerItem) {
        const inventoryItem = maybeGetSlotByRef(
          ownedItems,
          containerItem.refSlot
        );

        if (!isEqual(inventoryItem, containerItem.refItem)) {
          setSurrogateInventoryItemAtIndex(i, undefined);
        }
      }
    }
  }, [surrogateInventory, ...ownedItemVersions(reactResources, userId)]);

  return {
    slots: surrogateInventory,
    setSlotAtIndex,
    clear,
  };
}
