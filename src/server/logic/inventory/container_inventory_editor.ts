import { ContainerInventory } from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { ItemAndCount, OwnedItemReference } from "@/shared/ecs/gen/types";
import { isValidInventoryItemCount } from "@/shared/game/inventory";
import {
  equalItems,
  getContainerItemByRef,
  isDroppableItem,
  setContainerItemByRef,
} from "@/shared/game/items";
import { ok } from "assert";

export class ContainerInventoryEditor {
  constructor(public readonly entity: Delta) {}

  get id() {
    return this.entity.id;
  }

  inventory() {
    return this.entity.containerInventory() ?? ContainerInventory.create();
  }

  mutableInventory() {
    return this.entity.mutableContainerInventory();
  }

  _get(ref: OwnedItemReference | undefined): ItemAndCount | undefined {
    if (!ref) {
      return;
    }
    ok(ref.kind === "item");
    return getContainerItemByRef(this.inventory().items, ref);
  }

  get(ref: OwnedItemReference | undefined): ItemAndCount | undefined;
  get(
    first: OwnedItemReference | undefined,
    ...refs: (OwnedItemReference | undefined)[]
  ): (ItemAndCount | undefined)[];
  get(
    ...refs: (OwnedItemReference | undefined)[]
  ): (ItemAndCount | undefined)[] | (ItemAndCount | undefined) {
    if (refs.length === 0) {
      return;
    }
    if (refs.length === 1) {
      return this._get(refs[0]);
    }
    return refs.map((ref) => this._get(ref));
  }

  set(ref: OwnedItemReference, value: ItemAndCount | undefined) {
    ok(ref.kind === "item");
    ok(ref.idx >= 0 && ref.idx < this.inventory().items.length);

    if (value === undefined || value.count === 0n) {
      this.mutableInventory().items[ref.idx] = undefined;
      return;
    }

    // Handle stackable things/slots.
    ok(
      isValidInventoryItemCount(value.item, value.count),
      `Invalid inventory count ${value.count}`
    );

    ok(value.item.stackable, `Item ${value.item.id} is not an inventory item`);
    ok(isDroppableItem(value.item), "Can't list soul bound");
    setContainerItemByRef(this.mutableInventory().items, ref, value);
  }

  attemptTakeFromSlot(ref: OwnedItemReference, items: ItemAndCount): boolean {
    const existing = this.get(ref);
    if (existing === undefined) {
      return false;
    }
    ok(equalItems(existing.item, items.item));
    if (existing.count === items.count) {
      this.set(ref, undefined);
      return true;
    }
    if (
      !isValidInventoryItemCount(existing.item, existing.count - items.count)
    ) {
      return false;
    }
    this.set(ref, {
      ...existing,
      count: existing.count - items.count,
    });
    return true;
  }

  find(item: ItemAndCount): [OwnedItemReference, ItemAndCount] | undefined {
    const items = this.inventory().items;
    for (let i = 0; i <= items.length; ++i) {
      if (
        items[i]?.item.id === item.item.id &&
        items[i]?.count === item.count
      ) {
        return [{ idx: i, kind: "item" }, item];
      }
    }

    return undefined;
  }
}
