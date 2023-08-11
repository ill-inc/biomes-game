import { Wearing } from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import {
  equalItems,
  getAssignmentItemByRef,
  setAssignmentItemByRef,
} from "@/shared/game/items";
import type { ItemAndCount } from "@/shared/game/types";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import { ok } from "assert";

export class WearingInventoryEditor {
  constructor(public readonly entity: Delta) {}

  get id() {
    return this.entity.id;
  }

  wearing() {
    return this.entity.wearing() ?? Wearing.create();
  }

  mutableWearing() {
    return this.entity.mutableWearing();
  }

  _get(ref: OwnedItemReference | undefined): ItemAndCount | undefined {
    if (!ref) {
      return;
    }
    ok(ref.kind === "wearable");
    return getAssignmentItemByRef(this.wearing().items, ref);
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
    ok(ref.kind === "wearable");
    if (value === undefined || value.count === 0n) {
      this.mutableWearing().items.delete(ref.key);
      return;
    }

    ok(
      findItemEquippableSlot(value.item, [ref.key]),
      `Item ${value.item.id} is not wearable in slot ${ref.key}`
    );
    setAssignmentItemByRef(this.mutableWearing().items, ref, value);
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
    this.set(ref, {
      ...existing,
      count: existing.count - items.count,
    });
    return true;
  }
}
