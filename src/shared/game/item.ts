import { getBiscuit, isBiscuit } from "@/shared/bikkie/active";
import type { AnyBikkieAttribute } from "@/shared/bikkie/attributes";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { RawItem } from "@/shared/game/raw_item";
import { zRawItem } from "@/shared/game/raw_item";
import { biomesItemSymbol } from "@/shared/game/zod_symbols";
import type { BiomesId } from "@/shared/ids";
import { makeZodType } from "@/shared/zrpc/custom_types";
import { cloneDeep, isEqual } from "lodash";
import type { ZodType } from "zod";

export type ItemPayload = Record<number, any>;

export type Item = {
  readonly id: BiomesId;
  readonly payload?: ItemPayload | undefined;
} & Biscuit;

export type ReadonlyItem = Readonly<Item>;
function prepareItem(item: RawItem & { [biomesItemSymbol]?: boolean }): Item {
  if (item[biomesItemSymbol]) {
    return item as Item;
  } else if (isBiscuit(item)) {
    // Avoid recursive prototype chains.
    item = { id: item.id };
  }
  const prototype: any = {
    [biomesItemSymbol]: true,
    prepareForZrpc: () => ({
      id: item.id,
      payload: item.payload,
    }),
  };
  if (item.payload) {
    let isEmpty = true;
    for (const rawId in item.payload) {
      isEmpty = false;
      const id = parseInt(rawId);
      const attribute = attribs.byId.get(id);
      if (attribute) {
        prototype[attribute.name] = item["payload"][id];
      }
    }
    if (isEmpty) {
      delete item.payload;
    }
  }
  const biscuit = getBiscuit(item.id);
  if (biscuit) {
    Object.setPrototypeOf(prototype, biscuit);
  }
  Object.setPrototypeOf(item, prototype);
  return item as Item;
}
export function cloneDeepWithItems<T>(item: T): T {
  const clone = cloneDeep(item);
  if ((item as any)[biomesItemSymbol]) {
    Object.setPrototypeOf(clone, Object.getPrototypeOf(item));
  }
  return clone;
}

export function isItem(item: unknown): item is Item {
  return typeof item === "object" && item !== null && biomesItemSymbol in item;
}

export function isItemEqual(a?: Item, b?: Item) {
  if (a === b) {
    return true;
  } else if (a === undefined || b === undefined) {
    return false;
  }
  return a.id === b.id && isEqual(a.payload, b.payload);
}

export function anItem(rawItem: undefined): undefined;
export function anItem(rawItem: Readonly<RawItem>): Item;
export function anItem(rawItem?: Readonly<RawItem>): Item | undefined;
export function anItem(id: BiomesId, payload?: ItemPayload | undefined): Item;
export function anItem(
  id?: BiomesId,
  payload?: ItemPayload | undefined
): Item | undefined;
export function anItem(
  id?: BiomesId | Readonly<RawItem>,
  payload?: ItemPayload | undefined
): Item | undefined {
  return id !== undefined
    ? prepareItem(typeof id === "number" ? { id, payload } : id)
    : undefined;
}
export const zItem = makeZodType(
  (val: RawItem) => anItem(val),
  zRawItem
).annotate(biomesItemSymbol, true) as ZodType<Item>;

export function resolveItemAttribute(
  item: Item,
  attribute: AnyBikkieAttribute
): any {
  return item[attribute.name as keyof Item];
}

export function resolveItemAttributeId(item: Item, attributeId: number): any {
  const attribute = attribs.byId.get(attributeId);
  if (!attribute) {
    return undefined;
  }
  return resolveItemAttribute(item, attribute);
}

/// Updates the attributes of an item.
/// Note: since items are immutable, this returns a new item.
export function updateItem(item: Item, updatedPayload: ItemPayload): Item {
  return anItem(item.id, <ItemPayload>{
    ...item.payload,
    ...updatedPayload,
  });
}
