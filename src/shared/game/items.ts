import type { ShapeID } from "@/shared/asset_defs/shapes";
import { getShapeID } from "@/shared/asset_defs/shapes";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import { ITEM_TYPES } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type {
  ItemAndCount,
  ReadonlyItem,
  ReadonlyItemAndCount,
} from "@/shared/ecs/extern";
import type {
  ItemAssignment,
  ItemAssignmentReference,
  ItemBag,
  ItemBagReference,
  ItemContainer,
  ItemContainerReference,
  ItemSet,
  PricedItemContainer,
  PricedItemSlot,
  ReadonlyItemAssignment,
  ReadonlyItemBag,
  ReadonlyItemContainer,
  ReadonlyItemSet,
  ReadonlyPricedItemContainer,
} from "@/shared/ecs/gen/types";
import type { BagSpec } from "@/shared/game/bag_spec";
import type { TakeOptions } from "@/shared/game/inventory";
import type { Item, ItemPayload } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import type {
  LootProbability,
  LootTable,
  LootTableSlot,
} from "@/shared/game/item_specs";
import { zLootProbability } from "@/shared/game/item_specs";
import type { RawItem } from "@/shared/game/raw_item";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import type { GameStateContext } from "@/shared/loot_tables/indexing";
import { rollSlottedProbabilityTable } from "@/shared/loot_tables/probability_table";
import { mapMap } from "@/shared/util/collections";
import { removeFalsyInPlace } from "@/shared/util/object";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { flatMap, isEqual, minBy, some, sortBy } from "lodash";
import { ZodEnum } from "zod";

export function equalItems(
  from: Item | undefined,
  to: Item | undefined,
  respectPayload: boolean = true
) {
  if (from === undefined) {
    return to === undefined;
  } else if (to === undefined) {
    return from === undefined;
  }
  return (
    from.id === to.id &&
    (!respectPayload || isEqual(from.payload ?? {}, to.payload ?? {}))
  );
}

export function getItemTypeId(item: Item): BiomesId;
export function getItemTypeId(item?: Item): BiomesId | undefined;
export function getItemTypeId(item?: Item): BiomesId | undefined {
  if (!item) {
    return;
  }
  if (ITEM_TYPES.has(item.id)) {
    return item.id;
  }

  for (const [id, fn] of ITEM_TYPES) {
    if (fn(item)) {
      return id;
    }
  }

  return item.id;
}

export function itemIsOfType(
  concreteItem: Item | undefined,
  representativeItem: Item | undefined
): boolean {
  if (concreteItem === representativeItem) {
    return true;
  }
  if (equalItems(representativeItem, concreteItem, false)) {
    return true;
  }

  if (!concreteItem || !representativeItem) {
    return false;
  }

  const itemFilter = ITEM_TYPES.get(representativeItem.id);
  if (itemFilter) {
    return itemFilter(concreteItem);
  }

  return !!(
    concreteItem &&
    representativeItem &&
    getItemTypeId(concreteItem) === getItemTypeId(representativeItem)
  );
}

export function isSplittableItem(item: ItemAndCount | undefined): boolean {
  return item !== undefined && item.count > 1n;
}

export function itemCountToApproximateNumber(itemAndCount: ItemAndCount) {
  return Number(itemAndCount.count);
}

export function itemPk(item: { id: number; payload?: unknown }): string {
  if (item.payload === undefined) {
    return `${item.id}`;
  }
  const payload = JSON.stringify(item.payload);
  if (payload === "{}") {
    return `${item.id}`;
  }
  return `${item.id}:${payload}`;
}

function addToBagByPk(
  bag: ItemBag,
  pk: string,
  itemAndCount: ReadonlyItemAndCount
) {
  const existing = bag.get(pk);
  if (existing) {
    ok(
      existing.count + itemAndCount.count >= 0n,
      `Invalid item count ${existing.count + itemAndCount.count} from ${
        existing.count
      }`
    );
    bag.set(pk, {
      ...existing,
      count: existing.count + itemAndCount.count,
    });
  } else {
    ok(itemAndCount.count >= 0n, `Invalid item count: ${itemAndCount.count}`);
    bag.set(pk, itemAndCount);
  }
}

export function addToSet(bag: ItemSet, itemsOrBag: Item | ItemSet | ItemBag) {
  if (itemsOrBag instanceof Map) {
    for (const [pk, item] of itemsOrBag) {
      bag.set(
        pk,
        (item as ItemAndCount).item
          ? (item as ItemAndCount).item
          : (item as Item)
      );
    }
    return;
  }
  bag.set(itemPk(itemsOrBag), itemsOrBag);
}

function isBag(
  itemsOrBag: ReadonlyItemAndCount | ReadonlyItemBag
): itemsOrBag is ReadonlyItemBag {
  return itemsOrBag instanceof Map;
}

export function isBagEmpty(bag: ReadonlyItemBag) {
  return bag.size === 0;
}

export function addToBag(
  bag: ItemBag,
  itemsOrBag: ReadonlyItemAndCount | ReadonlyItemBag
) {
  if (isBag(itemsOrBag)) {
    for (const [pk, itemAndCount] of itemsOrBag) {
      addToBagByPk(bag, pk, itemAndCount);
    }
    return;
  }
  addToBagByPk(bag, itemPk(itemsOrBag.item), itemsOrBag);
}

export function bagWith(
  bag: ItemBag,
  itemsOrBag: ReadonlyItemAndCount | ReadonlyItemBag
) {
  const result: ItemBag = new Map(bag);
  addToBag(result, itemsOrBag);
  return result;
}

export function removeFromSet(itemSet: ItemSet, item: Item) {
  itemSet.delete(itemPk(item));
}

export function createItemSet(...items: Item[]) {
  const set: ItemSet = new Map();
  for (const item of items) {
    set.set(itemPk(item), item);
  }
  return set;
}

export function createBag(...items: ReadonlyItemAndCount[]) {
  const bag: ItemBag = new Map();
  for (const item of items) {
    addToBagByPk(bag, itemPk(item.item), item);
  }
  return bag;
}
interface BagCheckItem {
  id: BiomesId;
  payload?: unknown;
  count?: undefined;
}
interface BagCheckItemAndCount {
  item: BagCheckItem;
  count?: bigint;
}

function bagContainsByPk(
  bag: ReadonlyItemBag,
  pk: string,
  itemAndCount: BagCheckItemAndCount
) {
  const existing = bag.get(pk);
  if (existing === undefined) {
    return false;
  }
  if (itemAndCount.count === undefined) {
    return true;
  }
  return (
    existing.count >= itemAndCount.count &&
    (existing.count === itemAndCount.count ||
      existing.count - itemAndCount.count >= 0)
  );
}

export function bagCount(
  bag?: ReadonlyItemBag,
  item?: BagCheckItem | string,
  takeOptions: TakeOptions = {
    respectPayload: true,
  }
): bigint {
  if (bag === undefined || item === undefined) {
    return 0n;
  }
  // ignoring payload means we must crawl the bags' keys to find the item.
  if (!takeOptions.respectPayload) {
    const targetPk =
      typeof item === "string" ? item.split(":")[0] : `${item.id}`;
    let count = 0n;
    for (const [pk, itemAndCount] of bag) {
      if (takeOptions.predicate?.(itemAndCount) === false) {
        continue;
      }

      const targetItem = anItem(parseBiomesId(targetPk));
      if (pk === targetPk || pk.startsWith(targetPk + ":")) {
        count += itemAndCount.count;
      } else if (
        takeOptions.allowTypeMatch &&
        item &&
        (ITEM_TYPES.has(targetItem.id) ||
          ITEM_TYPES.has(itemAndCount.item.id)) &&
        itemIsOfType(itemAndCount.item, targetItem)
      ) {
        count += itemAndCount.count;
      }
    }
    return count;
  }

  const foundItem = bag.get(typeof item === "string" ? item : itemPk(item));
  if (foundItem && takeOptions.predicate?.(foundItem) === false) {
    return 0n;
  }

  return foundItem?.count ?? 0n;
}

export function bagCountMatches(
  bag?: ReadonlyItemBag,
  matchFn?: (item: ReadonlyItem) => boolean
): bigint {
  if (bag === undefined) {
    return 0n;
  }
  let count = 0n;
  for (const itemAndCount of bag.values()) {
    if (!matchFn || matchFn(itemAndCount.item)) {
      count += itemAndCount.count;
    }
  }
  return count;
}

export function countTypesInBag(
  bag: ReadonlyItemBag,
  representativeItemId?: BiomesId,
  predicate?: (itemAndCount: ItemAndCount) => boolean
): number {
  const representativeItem = representativeItemId
    ? anItem(representativeItemId)
    : undefined;
  let sum = 0;
  for (const itemCount of bag.values()) {
    if (predicate && !predicate(itemCount)) {
      continue;
    }

    if (
      representativeItem === undefined ||
      itemIsOfType(itemCount.item, representativeItem)
    ) {
      sum += Number(itemCount.count);
    }
  }
  return sum;
}

export function itemSetContains(
  set: ReadonlyItemSet | undefined,
  item: Item
): boolean {
  return set !== undefined && set.has(itemPk(item));
}

export function bagContains(
  bag: ReadonlyItemBag,
  itemsOrBagNeeded:
    | BagCheckItemAndCount
    | BagCheckItem
    | ReadonlyItemBag
    | undefined,
  takeOptions: TakeOptions = {
    respectPayload: true,
  }
): boolean {
  if (itemsOrBagNeeded === undefined) {
    return true;
  }
  if (itemsOrBagNeeded instanceof Map) {
    if (!takeOptions.respectPayload) {
      // Must crawl if we don't respect payload
      if (
        some(
          [...(itemsOrBagNeeded as ReadonlyItemBag).values()],
          ({ item, count }) => {
            return bagCount(bag, item, takeOptions) < (count ?? 1n);
          }
        )
      ) {
        return false;
      }
      return true;
    }
    for (const [pk, itemAndCount] of itemsOrBagNeeded) {
      if (!bagContainsByPk(bag, pk, itemAndCount)) {
        return false;
      }
    }
    return true;
  }
  const itemOrItemsNeeded = itemsOrBagNeeded as
    | BagCheckItemAndCount
    | BagCheckItem;
  const itemsNeeded =
    itemOrItemsNeeded.count === undefined
      ? ({ item: itemOrItemsNeeded } as BagCheckItemAndCount)
      : itemOrItemsNeeded;
  if (!takeOptions.respectPayload) {
    return (
      bagCount(bag, itemsNeeded.item, takeOptions) >= (itemsNeeded.count ?? 1n)
    );
  }
  return bagContainsByPk(bag, itemPk(itemsNeeded.item), itemsNeeded);
}

export function bagEquals(a: ReadonlyItemBag, b: ReadonlyItemBag) {
  return bagContains(a, b) && bagContains(b, a);
}

export function setContains(set: ReadonlyItemSet, item: BagCheckItem) {
  return set.has(itemPk(item));
}

function takeFromBagByPk(bag: ItemBag, pk: string, need: ItemAndCount) {
  const existing = bag.get(pk)!;
  if (existing.count === need.count) {
    bag.delete(pk);
  } else {
    ok(existing.count > need.count);
    bag.set(pk, {
      ...existing,
      count: existing.count - need.count,
    });
  }
}

// Takes items from bag, returning true if successful
export function takeFromBag(
  bag: ItemBag,
  itemsOrBagNeeded: ItemAndCount | ItemBag | undefined
): boolean {
  if (!bagContains(bag, itemsOrBagNeeded)) {
    return false;
  }
  if (itemsOrBagNeeded === undefined) {
    return true;
  }
  if (itemsOrBagNeeded instanceof Map) {
    for (const [pk, need] of itemsOrBagNeeded) {
      takeFromBagByPk(bag, pk, need);
    }
  } else {
    takeFromBagByPk(bag, itemPk(itemsOrBagNeeded.item), itemsOrBagNeeded);
  }
  return true;
}

export function getContainerItemByRef(
  container: ReadonlyItemContainer,
  ref: ItemContainerReference
): ItemAndCount | undefined {
  ok(
    ref.idx >= 0 && ref.idx < container.length,
    `${ref.idx} out of bounds ${container.length}`
  );
  return container[ref.idx];
}

export function getPricedContainerItemByRef(
  container: ReadonlyPricedItemContainer,
  ref: ItemContainerReference
): PricedItemSlot {
  ok(
    ref.idx >= 0 && ref.idx < container.length,
    `${ref.idx} out of bounds ${container.length}`
  );
  return container[ref.idx];
}

export function containerToBag(container: ReadonlyItemContainer): ItemBag {
  const items: ItemAndCount[] = [];
  for (const slot of container) {
    if (!slot) {
      continue;
    }
    items.push(slot);
  }
  return createBag(...items);
}

export function getAssignmentItemByRef(
  assignment: ReadonlyItemAssignment,
  ref: ItemAssignmentReference
): ItemAndCount | undefined {
  const item = assignment.get(ref.key);
  if (item === undefined) {
    return undefined;
  }
  return {
    item,
    count: 1n,
  };
}

export function getBagItemByRef(
  bag: ReadonlyItemBag,
  ref: ItemBagReference
): ItemAndCount | undefined {
  return bag.get(ref.key);
}

export function bagRefTo(item: Item) {
  return { key: itemPk(item) };
}

export function setContainerItemByRef(
  container: ItemContainer,
  ref: ItemContainerReference,
  value?: ItemAndCount
) {
  ok(ref.idx >= 0 && ref.idx < container.length);
  if (value === undefined) {
    container[ref.idx] = undefined;
    return;
  }
  container[ref.idx] = value;
}

export function setPricedContainerItemByRef(
  container: PricedItemContainer,
  ref: ItemContainerReference,
  value?: PricedItemSlot
) {
  ok(ref.idx >= 0 && ref.idx < container.length);
  if (value === undefined) {
    container[ref.idx] = undefined;
    return;
  }
  container[ref.idx] = value;
}

export function setAssignmentItemByRef(
  assignment: ItemAssignment,
  ref: ItemAssignmentReference,
  value?: ItemAndCount
) {
  if (value === undefined) {
    assignment.delete(ref.key);
    return;
  }
  ok(value.count === 1n);
  assignment.set(ref.key, value.item);
}

export function setBagItemByRef(
  bag: ItemBag,
  ref: ItemBagReference,
  value?: ItemAndCount
) {
  if (value === undefined) {
    bag.delete(ref.key);
    return;
  }
  ok(ref.key === itemPk(value.item));
  bag.set(ref.key, value);
}

function interpretCountOfArgs(
  countOrPayload: ItemPayload | bigint | undefined,
  countWhenWithPayload: bigint | undefined
): [ItemPayload | undefined, bigint] {
  if (countOrPayload === undefined) {
    if (countWhenWithPayload === undefined) {
      return [undefined, 1n];
    }
    return [undefined, countWhenWithPayload];
  }
  if (typeof countOrPayload === "bigint") {
    return [undefined, countOrPayload];
  }
  return [countOrPayload, countWhenWithPayload ?? 1n];
}

export function countOf(
  id: BiomesId,
  payload: ItemPayload | undefined,
  count?: bigint
): ItemAndCount;
export function countOf(id: BiomesId, count?: bigint): ItemAndCount;
export function countOf(id: Item | RawItem, count?: bigint): ItemAndCount;
export function countOf(
  idOrItem: BiomesId | Item | RawItem,
  countOrPayload: ItemPayload | bigint | undefined,
  countWhenWithPayload?: bigint
): ItemAndCount {
  const [payload, count] = interpretCountOfArgs(
    countOrPayload,
    countWhenWithPayload
  );
  ok(count >= 0);
  const item =
    typeof idOrItem === "number" ? anItem(idOrItem, payload) : anItem(idOrItem);
  return { item, count };
}

export function bagSpecToBag(spec: BagSpec): ItemBag;
export function bagSpecToBag(spec?: BagSpec): ItemBag | undefined;
export function bagSpecToBag(spec?: BagSpec): ItemBag | undefined {
  if (spec === undefined) {
    return;
  }
  const contents = spec.map(([id, count]) =>
    countOf(id, BigInt(Math.floor(count)))
  );
  return createBag(...contents);
}

export function bagToBagSpec(bag: ItemBag): BagSpec;
export function bagToBagSpec(bag?: ItemBag): BagSpec | undefined;
export function bagToBagSpec(bag?: ItemBag): BagSpec | undefined {
  if (!bag) {
    return;
  }
  return mapMap(bag, ({ item, count }) => [item.id, Number(count)]);
}

export function durabilityRemaining(item?: Item): number | undefined {
  if (!item) {
    return undefined;
  }

  const instanceDurability = item.lifetimeDurabilityMs ?? 0;
  const classDurability = anItem(item.id).lifetimeDurabilityMs ?? 0;
  if (classDurability > 0) {
    return (100 * instanceDurability) / classDurability;
  }
}

export function waterLevelRemaining(item?: Item): number | undefined {
  if (!item) {
    return undefined;
  }
  const instanceWaterAmount = item.waterAmount;
  const classWaterAmount = anItem(item.id).waterAmount;
  if (classWaterAmount > 0) {
    return (100 * instanceWaterAmount) / classWaterAmount;
  }
}

export function isAtMaxDurability(item?: Item): boolean {
  const r = durabilityRemaining(item);
  return r === 100 || r === undefined;
}

export function isDroppableItem(item: Item): boolean {
  return !!item.isDroppable;
}

export function itemDeletesOnDrop(item: Item): boolean {
  return !!item.deletesOnDrop;
}

// Special logic, we strip item weights out of fish so they stack
export function fishingBagTransform(bag: ReadonlyItemBag) {
  return createBag(
    ...mapMap(bag, (v) =>
      countOf(
        v.item.id,
        removeFalsyInPlace({
          ...v.item.payload,
          [attribs.fishLength.id]: undefined,
        }),
        v.count
      )
    )
  );
}

const shapeToItem = bikkieDerived("shapeToItem", () => {
  const shapeToItem = new Map<ShapeID, Item>();
  for (const biscuit of getBiscuits("/items/tools")) {
    if (!biscuit.shape) {
      continue;
    }
    const toolItem = anItem(biscuit.id);
    const toolType = getItemTypeId(toolItem);
    if (toolType) {
      const shapeId = getShapeID(biscuit.shape);
      if (shapeId) {
        const existingItem = shapeToItem.get(shapeId);
        // Get the "worst" tool for a given shape; should be the base tool
        // or a wooden tool
        if (
          !existingItem ||
          existingItem.hardnessClass > toolItem.hardnessClass
        ) {
          shapeToItem.set(shapeId, toolItem);
        }
      }
    }
  }
  return shapeToItem;
});

export const toolForShapeId = (find: ShapeID): Item | undefined => {
  if (!find) {
    return;
  }
  return shapeToItem().get(find);
};

export function shapeIdForTool(tool?: Item): ShapeID | undefined {
  const shapeName = tool?.shape;
  if (!shapeName) {
    return;
  }
  return getShapeID(shapeName);
}

export function isCompostableItem(item: Item): boolean {
  return !!(
    item.isFish ||
    item.isSeed ||
    // This one is a hack; no good way to tell if an item is flora
    // Replace with isCompostable if we want this behavior
    (item.isBlock && item.galoisPath?.startsWith("flora")) ||
    //Explicitly marked as compostable
    item.isCompostable
  );
}

export function rollLootTable(
  table: LootTable,
  context?: GameStateContext,
  slots?: LootTableSlot[]
): ItemBag {
  const outputs = rollSlottedProbabilityTable(table, context, slots, true);
  return createBag(
    ...flatMap(outputs, (itemCts) =>
      itemCts.map(([item, count]) => countOf(item, BigInt(Math.floor(count))))
    )
  );
}

export function lootProbabilityToNumber(prob: LootProbability): number {
  if (typeof prob === "number") {
    return prob;
  }
  switch (prob) {
    case "never":
      return 0;
    case "mythic":
      return 0.001;
    case "legendary":
      return 0.005;
    case "epic":
      return 0.01;
    case "rare":
      return 0.05;
    case "uncommon":
      return 0.1;
    case "common":
      return 0.2;
    case "very common":
      return 0.5;
    case "guaranteed":
      return 1;
  }
  assertNever(prob);
  return 0;
}

export function maxLootProbability(probs: LootProbability[]): LootProbability {
  if (probs.length === 0) {
    return "never";
  }
  return sortBy(probs, (prob) => -lootProbabilityToNumber(prob))[0];
}

let reverseLootProbabilityMap:
  | Map<number, Exclude<LootProbability, number>>
  | undefined;

export function numberToLootProbability(num: number) {
  if (!reverseLootProbabilityMap) {
    reverseLootProbabilityMap = new Map();
    const enums = flatMap(zLootProbability.options, (opt) => {
      if (opt instanceof ZodEnum) {
        return Object.keys(opt.Enum) as LootProbability[];
      }
      return [];
    });

    enums.forEach((prob) => {
      if (typeof prob === "number") {
        return;
      }
      reverseLootProbabilityMap?.set(lootProbabilityToNumber(prob), prob);
    });
  }
  return reverseLootProbabilityMap.get(num);
}

export function closestNamedLootProbability(prob: LootProbability) {
  if (typeof prob === "number") {
    const allProbs = [...(reverseLootProbabilityMap?.keys() ?? [])];
    const closest = minBy(allProbs, (p) =>
      Math.abs(p - lootProbabilityToNumber(prob))
    );
    return closest ? numberToLootProbability(closest) : "never";
  }
  return prob;
}
