import { PricedContainerInventory } from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import type {
  OwnedItemReference,
  PricedItemSlot,
} from "@/shared/ecs/gen/types";
import { isValidInventoryItemCount } from "@/shared/game/inventory";
import {
  getPricedContainerItemByRef,
  isDroppableItem,
  setPricedContainerItemByRef,
} from "@/shared/game/items";
import { ok } from "assert";

export class PricedContainerInventoryEditor {
  constructor(public readonly entity: Delta) {}

  get id() {
    return this.entity.id;
  }

  inventory() {
    return (
      this.entity.pricedContainerInventory() ??
      PricedContainerInventory.create()
    );
  }

  private mutableInventory() {
    return this.entity.mutablePricedContainerInventory();
  }

  _get(ref: OwnedItemReference | undefined): PricedItemSlot {
    if (!ref) {
      return;
    }
    ok(ref.kind === "item");
    return getPricedContainerItemByRef(this.inventory().items, ref);
  }

  get(ref: OwnedItemReference | undefined): PricedItemSlot;
  get(
    first: OwnedItemReference | undefined,
    ...refs: (OwnedItemReference | undefined)[]
  ): PricedItemSlot[];
  get(
    ...refs: (OwnedItemReference | undefined)[]
  ): PricedItemSlot[] | PricedItemSlot {
    if (refs.length === 0) {
      return;
    }
    if (refs.length === 1) {
      return this._get(refs[0]);
    }
    return refs.map((ref) => this._get(ref));
  }

  set(ref: OwnedItemReference, value: PricedItemSlot) {
    ok(ref.kind === "item");
    ok(ref.idx >= 0 && ref.idx < this.inventory().items.length);

    if (value === undefined || value.contents.count === 0n) {
      this.mutableInventory().items[ref.idx] = undefined;
      return;
    }

    // Handle stackable things/slots.
    ok(
      isValidInventoryItemCount(value.contents.item, value.contents.count),
      `Invalid inventory count ${value.contents.count}`
    );
    ok(
      isValidInventoryItemCount(value.price.item, value.price.count),
      `Invalid inventory count ${value.price.count}`
    );
    ok(value.price.item.isCurrency, `Expected price to be a currency`);
    ok(isDroppableItem(value.contents.item), "Can't list soul bound");

    ok(
      value.contents.item.stackable,
      `Item ${value.contents.item.id} is not an inventory item`
    );
    setPricedContainerItemByRef(this.mutableInventory().items, ref, value);
  }
}
