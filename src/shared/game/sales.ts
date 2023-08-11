import type { Item } from "@/shared/game/item";
import type { ItemAndCount, ItemBag } from "@/shared/game/types";
import { ok } from "assert";

export const defaultItemPrice = 1 as const;

export function isSellable(item: Item) {
  return item.isDroppable && unitSellPrice(item) > 0n;
}

export function unitSellPrice(item: Item) {
  return BigInt(Math.floor(item.itemSellPrice ?? defaultItemPrice));
}

export function sellPrice(item: ItemAndCount) {
  return unitSellPrice(item.item) * item.count;
}

export function bagSellPrice(itemBag: ItemBag) {
  let ret: bigint = 0n;
  for (const [_, item] of itemBag) {
    ok(isSellable(item.item));
    ret += sellPrice(item);
  }
  return ret;
}
