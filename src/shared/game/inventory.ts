import { BikkieIds, ITEM_TYPES, WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type {
  Item,
  ItemAndCount,
  ReadonlyItem,
  ReadonlyItemAndCount,
} from "@/shared/ecs/extern";
import type {
  Inventory,
  ReadonlyInventory,
  ReadonlySelectedItem,
  ReadonlyWearing,
  SelectedItem,
  Wearing,
} from "@/shared/ecs/gen/components";
import type {
  ItemBag,
  ItemBagReference,
  ItemSlot,
  OwnedItemReference,
  ReadonlyInventoryAssignmentPattern,
  ReadonlyItemBag,
  ReadonlyItemContainer,
  ReadonlyOwnedItemReference,
} from "@/shared/ecs/gen/types";
import { anItem, cloneDeepWithItems } from "@/shared/game/item";
import {
  addToBag,
  bagCount,
  bagRefTo,
  bagWith,
  countOf,
  createBag,
  equalItems,
  getAssignmentItemByRef,
  getBagItemByRef,
  getContainerItemByRef,
  itemIsOfType,
} from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { bigIntMax, bigIntMin } from "@/shared/util/bigint";
import { DefaultMap } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import { compact } from "lodash";

export const PLAYER_INVENTORY_SLOTS = 25;
export const PLAYER_HOTBAR_SLOTS = 9;

export function maxInventoryStack(item: Item): bigint {
  return item.stackable || 0n;
}

// Is a valid amount of an item to hold in the inventory (not overflow).
export function isValidInventoryItemCount(item: Item, count: bigint) {
  if (count < 0n || (count === 0n && !item.isCurrency)) {
    return false;
  } else if (count > maxInventoryStack(item)) {
    return false;
  }
  return true;
}

// Analogous to createBag, but will return undefined if the items could never
// be contained in a player inventory.
export function createInventorySafeBag(
  ...itemAndCounts: ItemAndCount[]
): ItemBag | undefined {
  const bag = createBag();
  for (const { item, count } of itemAndCounts) {
    // Note, we don't use isValidInventoryItemCount as in acquiring a bag it is
    // acceptable to split the input across multiple slots - thus max stack
    // does not apply.
    if (count <= 0) {
      return;
    }
    addToBag(bag, { item, count });
  }
  return bag;
}

export function OwnedItemReferencesEqual(
  a: OwnedItemReference,
  b: OwnedItemReference
): boolean {
  switch (a.kind) {
    case "item":
      return b.kind === "item" && a.idx === b.idx;
    case "hotbar":
      return b.kind === "hotbar" && a.idx === b.idx;
    case "currency":
      return b.kind === "currency" && a.key === b.key;
    case "wearable":
      return b.kind === "wearable" && a.key === b.key;
  }
}

export function refPk(a: OwnedItemReference): string {
  return JSON.stringify(
    Object.entries(a).sort(([a], [b]) => a.localeCompare(b))
  );
}

export function getMaxCombinable({
  from,
  to,
  count,
}: {
  from?: ItemAndCount;
  to?: ItemAndCount;
  count?: bigint;
}): bigint {
  if (from === undefined) {
    return 0n;
  }
  count ??= from.count ?? 0n;
  if (to !== undefined) {
    if (to.count + count <= 0n) {
      return 0n;
    }
    if (!equalItems(from.item, to.item)) {
      return 0n;
    }
  }
  if (from.count - count < 0n) {
    return 0n;
  }
  const available = bigIntMin(
    count,
    bigIntMax(maxInventoryStack(from.item) - (to?.count ?? 0n), 0n)
  );
  if (available === 0n) {
    return available;
  }
  return available;
}

export function isCombinableItems(arg: {
  from?: ItemAndCount;
  to?: ItemAndCount;
  count?: bigint;
}): boolean {
  return getMaxCombinable(arg) === (arg.count ?? arg.from?.count ?? 0n);
}

export interface OwnedItems {
  inventory?: Inventory;
  wearing?: Wearing;
  selected_item?: SelectedItem;
}

export interface ReadonlyOwnedItems {
  readonly inventory?: ReadonlyInventory;
  readonly wearing?: ReadonlyWearing;
  readonly selected_item?: ReadonlySelectedItem;
}

// Gets the items in the referred to inventory slot, if any.
export function maybeGetSlotByRef(
  from: ReadonlyOwnedItems,
  ref?: OwnedItemReference
): ItemAndCount | undefined {
  if (!ref) {
    return undefined;
  }

  return getSlotByRef(from, ref);
}
export function getSlotByRef(
  from: ReadonlyOwnedItems,
  ref: OwnedItemReference
): ItemAndCount | undefined {
  switch (ref.kind) {
    case "item":
      if (from.inventory !== undefined) {
        return getContainerItemByRef(from.inventory.items, ref);
      }
      break;
    case "hotbar":
      if (from.inventory !== undefined) {
        return getContainerItemByRef(from.inventory.hotbar, ref);
      }
      break;
    case "wearable":
      if (from.wearing !== undefined) {
        return getAssignmentItemByRef(from.wearing.items, ref);
      }
      break;
    case "currency":
      if (from.inventory !== undefined) {
        return (
          getBagItemByRef(from.inventory.currencies, ref) ??
          countOf(BikkieIds.bling, 0n)
        );
      }
      break;
    default:
      assertNever(ref);
  }
}

export function currencyRefTo(currency: BiomesId): OwnedItemReference {
  return {
    ...bagRefTo(anItem(currency)),
    kind: "currency",
  };
}

export function currencyBalance(
  inventory: ReadonlyInventory,
  currency: BiomesId
): bigint {
  return (
    getBagItemByRef(
      inventory.currencies,
      currencyRefTo(currency) as ItemBagReference
    )?.count ?? 0n
  );
}

export type MergeIndex = [OwnedItemReference, bigint];

// Find the best index for merge, returning the reference as well
// as the amount [from combinableAmount] for the slot.
// You should not use this method, typiclaly use: findSlotToMergeIntoInventory
// Note, it will preferentially choose slots that can be combined rather than
// empty ones, filling them where possible.
export function findBestIndexForMerge(
  refKind: "hotbar" | "item",
  container: ReadonlyItemContainer,
  combinableAmount: (slot: ItemSlot) => bigint,
  used: Set<string>
): MergeIndex | undefined {
  let currentBest: MergeIndex | undefined;
  let bestSlotCount = 0n;
  const swap = (candidate: MergeIndex, slotCount: bigint) => {
    if (currentBest === undefined || bestSlotCount < slotCount) {
      currentBest = candidate;
      bestSlotCount = slotCount;
    }
  };

  for (let i = 0; i < container.length; ++i) {
    const item = container[i];
    const amount = combinableAmount(item);
    if (!amount) {
      continue;
    }
    const ref = {
      kind: refKind,
      idx: i,
    };
    if (used.has(refPk(ref))) {
      continue;
    }
    swap([ref, amount], item?.count ?? 0n);
  }
  return currentBest;
}

// Find the best ref for merge, returning the reference as well
// as the amount [from combinableAmount] for the slot.
// You should not use this method, typically use: findSlotToMergeIntoInventory
function findBestRefForMerge(
  inventory: ReadonlyInventory,
  itemAndCount: ReadonlyItemAndCount,
  {
    partialOk,
    noHotbar,
    noInventory,
  }: {
    partialOk?: boolean;
    noHotbar?: boolean;
    noInventory?: boolean;
  },
  used?: Set<string>
): MergeIndex | undefined {
  const combinableAmount = partialOk
    ? (slot: ItemSlot) => {
        return getMaxCombinable({
          from: itemAndCount,
          to: slot,
        });
      }
    : (slot: ItemSlot) => {
        return isCombinableItems({
          from: itemAndCount,
          to: slot,
        })
          ? itemAndCount.count
          : 0n;
      };

  const avoidCandidates = new Set(used || []);
  let hotbarSelectedIdx: number | undefined;
  if (inventory.selected.kind === "hotbar") {
    avoidCandidates.add(refPk(inventory.selected));
    hotbarSelectedIdx = inventory.selected.idx;
  }
  if (!noHotbar) {
    const hotbarRef = findBestIndexForMerge(
      "hotbar",
      inventory.hotbar,
      combinableAmount,
      avoidCandidates
    );
    if (hotbarRef !== undefined) {
      return hotbarRef;
    }
  }
  if (!noInventory) {
    const itemsRef = findBestIndexForMerge(
      "item",
      inventory.items,
      combinableAmount,
      avoidCandidates
    );
    if (itemsRef !== undefined) {
      return itemsRef;
    }
  }
  if (
    !noHotbar &&
    hotbarSelectedIdx !== undefined &&
    !inventory.hotbar[hotbarSelectedIdx] &&
    !used?.has(refPk(inventory.selected))
  ) {
    // We avoided the empty selected slot earlier, but it's the only option now so take it.
    const usable = combinableAmount(inventory.hotbar[hotbarSelectedIdx]);
    if (usable > 0n) {
      return [inventory.selected, usable];
    }
  }
}

export type InventoryAssignmentPattern = [
  ReadonlyOwnedItemReference,
  ItemAndCount
][];

export function patternAsBag(pattern?: ReadonlyInventoryAssignmentPattern) {
  return createBag(...(pattern?.map((p) => p[1]) ?? []));
}

export function patternAsSingleRef(
  pattern?: InventoryAssignmentPattern
): OwnedItemReference | undefined {
  if (pattern !== undefined && pattern.length === 1) {
    return pattern[0][0];
  }
}

export function findSlotToMergeIntoInventory(
  target: ReadonlyOwnedItems,
  itemAndCount: ItemAndCount,
  options: {
    spreadOk?: boolean;
    noHotbar?: boolean;
    noInventory?: boolean;
  },
  used?: Set<string>
): InventoryAssignmentPattern | undefined {
  if (itemAndCount.item.isCurrency) {
    if (target.inventory === undefined) {
      return;
    }
    return [
      [
        {
          kind: "currency",
          ...bagRefTo(itemAndCount.item),
        },
        itemAndCount,
      ],
    ];
  } else if (itemAndCount.item.isRecipe) {
    // Recipes cannot be given as normal items.
    return [];
  }
  if (target.inventory === undefined) {
    return;
  }

  if (!options.spreadOk) {
    // Attempt to find a slot that'll take the full item.
    const ref = findBestRefForMerge(
      target.inventory,
      itemAndCount,
      options,
      used
    );
    if (ref === undefined) {
      return;
    }
    used?.add(refPk(ref[0]));
    return [[ref[0], itemAndCount]];
  }

  // Attempt to spread across multiple.
  const pattern: InventoryAssignmentPattern = [];
  let remaining = itemAndCount.count;
  while (remaining > 0n) {
    const ref = findBestRefForMerge(
      target.inventory,
      {
        item: itemAndCount.item,
        count: remaining,
      },
      {
        ...options,
        partialOk: true,
      },
      used
    );
    if (ref === undefined) {
      // We failed, abandon everything.
      return;
    }
    used?.add(refPk(ref[0]));
    pattern.push([ref[0], countOf(itemAndCount.item, ref[1])]);
    remaining -= ref[1];
  }
  return pattern;
}

export function determineGivePattern(
  to: ReadonlyOwnedItems,
  input: ItemBag
): InventoryAssignmentPattern | undefined {
  const used = new Set<string>();
  const pattern: InventoryAssignmentPattern = [];
  for (const itemAndCount of input.values()) {
    const subPattern = findSlotToMergeIntoInventory(
      to,
      itemAndCount,
      {
        spreadOk: true,
      },
      used
    );
    if (subPattern === undefined) {
      return;
    }
    pattern.push(...subPattern);
  }
  return pattern;
}

function findSlotToTakeFromInventory(
  from: ReadonlyOwnedItems,
  items: ItemAndCount,
  takeOptions: TakeOptions
): InventoryAssignmentPattern | undefined {
  // Handle currency taking.
  if (items.item.isCurrency) {
    if (from.inventory === undefined) {
      return;
    }
    const ref = bagRefTo(items.item);
    const existingCount =
      getBagItemByRef(from.inventory.currencies, ref)?.count ?? 0n;
    if (!isValidInventoryItemCount(items.item, existingCount - items.count)) {
      // No where to come from!
      return;
    }
    return [[{ ...ref, kind: "currency" }, items]];
  } else if (items.item.isRecipe) {
    // You cannot take recipes.
    return;
  }

  let remaining = items.count;
  const pattern: [OwnedItemReference, ItemAndCount][] = [];

  // Try for inventory first.
  if (from.inventory !== undefined) {
    const tryFromContainer = (
      name: "item" | "hotbar",
      container: ReadonlyItemContainer
    ) => {
      for (let idx = 0; idx < container.length && remaining > 0; ++idx) {
        const slot = container[idx];
        if (
          !slot ||
          (!equalItems(slot.item, items.item, takeOptions.respectPayload) &&
            !(
              takeOptions.allowTypeMatch &&
              ITEM_TYPES.has(items.item.id) &&
              itemIsOfType(slot.item, items.item)
            ))
        ) {
          continue;
        }
        const take = remaining < slot.count ? remaining : slot.count;
        if (
          take !== slot.count &&
          !isValidInventoryItemCount(items.item, slot.count - take)
        ) {
          return;
        }
        remaining -= take;
        pattern.push([
          {
            kind: name,
            idx,
          },
          {
            item: slot.item,
            count: take,
          },
        ]);
      }
    };
    tryFromContainer("item", from.inventory.items);
    tryFromContainer("hotbar", from.inventory.hotbar);
  }

  // Try for wearing.
  if (from.wearing !== undefined) {
    for (const key of WEARABLE_SLOTS) {
      if (remaining === 0n) {
        break;
      }
      const worn = from.wearing.items.get(key);
      if (!worn || !equalItems(worn, items.item)) {
        continue;
      }
      const take = remaining < 1n ? remaining : 1n;
      if (take !== 1n && !isValidInventoryItemCount(items.item, 1n - take)) {
        return;
      }
      remaining -= take;
      pattern.push([
        {
          kind: "wearable",
          key,
        },
        {
          item: worn,
          count: take,
        },
      ]);
    }
  }
  return remaining > 0 ? undefined : pattern;
}

export interface TakeOptions {
  respectPayload?: boolean;
  allowTypeMatch?: boolean;
  predicate?: (item: ItemAndCount) => boolean;
}

export function takeFromOwnedItems(
  ownedItems: OwnedItems,
  pattern: InventoryAssignmentPattern
): boolean {
  for (const [ref, itemAndCount] of pattern) {
    switch (ref.kind) {
      case "item":
        ownedItems.inventory!.items[ref.idx]!.count -= itemAndCount.count;
        if (ownedItems.inventory!.items[ref.idx]!.count === 0n) {
          delete ownedItems.inventory!.items[ref.idx];
        } else if (ownedItems.inventory!.items[ref.idx]!.count < 0n) {
          return false;
        }
        break;
      case "hotbar":
        ownedItems.inventory!.hotbar[ref.idx]!.count -= itemAndCount.count;
        if (ownedItems.inventory!.hotbar[ref.idx]!.count === 0n) {
          delete ownedItems.inventory!.hotbar[ref.idx];
        } else if (ownedItems.inventory!.hotbar[ref.idx]!.count < 0n) {
          return false;
        }
        break;
      case "wearable":
        if (!ownedItems.wearing?.items.has(ref.key)) {
          return false;
        }
        ownedItems.wearing.items.delete(ref.key);
        break;
      case "currency":
        ownedItems.inventory!.currencies.get(ref.key)!.count -=
          itemAndCount.count;
        if (ownedItems.inventory!.currencies.get(ref.key)!.count === 0n) {
          ownedItems.inventory!.currencies.delete(ref.key);
        } else if (ownedItems.inventory!.currencies.get(ref.key)!.count < 0n) {
          return false;
        }
        break;
      default:
        assertNever(ref);
    }
  }
  return true;
}

export function giveToOwnedItems(
  ownedItems: OwnedItems,
  pattern: InventoryAssignmentPattern
): boolean {
  for (const [ref, itemAndCount] of pattern) {
    switch (ref.kind) {
      case "item":
        if (ownedItems.inventory!.items[ref.idx] === undefined) {
          ownedItems.inventory!.items[ref.idx] = itemAndCount;
        } else if (
          equalItems(
            ownedItems.inventory!.items[ref.idx]!.item,
            itemAndCount.item
          )
        ) {
          ownedItems.inventory!.items[ref.idx]!.count += itemAndCount.count;
        } else {
          return false;
        }
        break;
      case "hotbar":
        if (ownedItems.inventory!.hotbar[ref.idx] === undefined) {
          ownedItems.inventory!.hotbar[ref.idx] = itemAndCount;
        } else if (
          equalItems(
            ownedItems.inventory!.hotbar[ref.idx]!.item,
            itemAndCount.item
          )
        ) {
          ownedItems.inventory!.hotbar[ref.idx]!.count += itemAndCount.count;
        } else {
          return false;
        }
        break;
      case "wearable":
        ownedItems.wearing?.items.set(ref.key, itemAndCount.item);
        break;
      case "currency":
        if (ownedItems.inventory!.currencies.get(ref.key) === undefined) {
          ownedItems.inventory!.currencies.set(ref.key, itemAndCount);
        } else if (
          equalItems(
            ownedItems.inventory!.currencies.get(ref.key)!.item,
            itemAndCount.item
          )
        ) {
          ownedItems.inventory!.currencies.get(ref.key)!.count +=
            itemAndCount.count;
        } else {
          return false;
        }
        break;
      default:
        assertNever(ref);
    }
  }
  return true;
}

export function itemRefsWhereTruthy(
  from: ReadonlyOwnedItems,
  attribute: keyof Biscuit
) {
  return matchingItemRefs(from, (e) => Boolean(e && e.item[attribute]));
}

export function matchingItemRefs(
  from: ReadonlyOwnedItems,
  predicate: (item: ItemAndCount | undefined) => boolean
): Array<OwnedItemReference> {
  const ret: Array<OwnedItemReference> = [];

  if (from.inventory) {
    for (let i = 0; i < from.inventory.items.length; i += 1) {
      const item = from.inventory.items[i];
      if (predicate(item)) {
        ret.push({
          kind: "item",
          idx: i,
        });
      }
    }

    for (let i = 0; i < from.inventory.hotbar.length; i += 1) {
      const item = from.inventory.hotbar[i];
      if (predicate(item)) {
        ret.push({
          kind: "hotbar",
          idx: i,
        });
      }
    }

    for (const [pk, item] of from.inventory.currencies) {
      if (predicate(item)) {
        ret.push({
          kind: "currency",
          key: pk,
        });
      }
    }
  }

  if (from.wearing) {
    for (const [id, item] of from.wearing.items) {
      if (predicate(countOf(item))) {
        ret.push({
          kind: "wearable",
          key: id,
        });
      }
    }
  }

  return ret;
}

export function determineTakePattern(
  from: ReadonlyOwnedItems,
  needed: ItemBag,
  takeOptions: TakeOptions = {
    respectPayload: true,
  }
): InventoryAssignmentPattern | undefined {
  const allocation: InventoryAssignmentPattern = [];

  let sortedNeeded: ItemAndCount[] | undefined;
  const ownedItems = cloneDeepWithItems(from) as OwnedItems;
  if (takeOptions.allowTypeMatch) {
    // If we are allowing type matches, we need to process these in order
    // of the most specific type match to the least specific type match.
    const types = [...needed.entries()]
      .map((e) => e[1].item)
      .filter((item) => ITEM_TYPES.has(item.id));
    const typeDepth = new DefaultMap<Item, number>((_item) => 0);
    for (const itemCt of needed.values()) {
      const item = itemCt.item;
      for (const type of types) {
        if (item.id !== type.id && itemIsOfType(item, type)) {
          typeDepth.set(item, typeDepth.get(item) + 1);
        }
      }
    }
    // Process items in order of type depth.
    sortedNeeded = [...needed.values()].sort(
      (a, b) => typeDepth.get(b.item) - typeDepth.get(a.item)
    );
  } else {
    sortedNeeded = [...needed.values()];
  }
  for (const item of sortedNeeded) {
    const index = findSlotToTakeFromInventory(ownedItems, item, takeOptions);
    if (index === undefined) {
      return;
    }
    // Update our local ownedItems bag. This doesn't affect the original bag,
    // but will let us keep track of what we've taken.
    if (!takeFromOwnedItems(ownedItems, index)) {
      return;
    }
    allocation.push(...index);
  }
  return allocation;
}

export function inventoryToBag(inventory: ReadonlyInventory) {
  return bagWith(
    createBag(...compact(inventory.items), ...compact(inventory.hotbar)),
    inventory.currencies
  );
}

export function inventoryCount(
  inventory: ReadonlyInventory,
  item: ReadonlyItem,
  options: TakeOptions = {
    respectPayload: true,
  }
): bigint {
  return bagCount(inventoryToBag(inventory), item, options);
}

export function isInventoryFull(localInventory?: ReadonlyInventory) {
  const items = localInventory?.items ?? [];
  const hotbar = localInventory?.hotbar ?? [];
  const inventorySlotsTaken =
    items.filter((item) => item !== undefined).length || 0;
  const hotbarSlotsTaken =
    hotbar.filter((item) => item !== undefined).length || 0;
  return (
    inventorySlotsTaken >= items.length && hotbarSlotsTaken >= hotbar.length
  );
}

export function canInventoryAcceptBag({
  inventory,
  itemBag,
}: {
  inventory?: ReadonlyInventory;
  itemBag: ReadonlyItemBag;
}) {
  if (!inventory) {
    return false;
  }

  for (const [_, itemAndCount] of itemBag) {
    const hasInventorySpace = !!findSlotToMergeIntoInventory(
      { inventory },
      itemAndCount,
      {}
    );

    if (!hasInventorySpace) {
      return false;
    }
  }

  return true;
}
