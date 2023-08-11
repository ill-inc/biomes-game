import type { ItemBag, ReadonlyItemBag } from "@/shared/ecs/gen/types";
import { deserializeItemBag, serializeItemBag } from "@/shared/ecs/gen/types";
import type { BagSpec } from "@/shared/game/bag_spec";
import { bagSpecToBag, bagToBagSpec } from "@/shared/game/items";

export function itemBagToString(bag: ReadonlyItemBag): string {
  return JSON.stringify(serializeItemBag(bag));
}

export function stringToItemBag(data: string): ItemBag {
  return deserializeItemBag(JSON.parse(data));
}

export function itemStringToBagSpec(itemString: string): BagSpec {
  return bagToBagSpec(stringToItemBag(itemString)) ?? [];
}

export function bagSpecToItemString(itemList: BagSpec): string {
  return itemBagToString(bagSpecToItemBag(itemList));
}

export function bagSpecToItemBag(itemList: BagSpec): ItemBag {
  return itemList ? bagSpecToBag(itemList) ?? new Map() : new Map();
}
