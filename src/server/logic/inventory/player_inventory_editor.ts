import { RollbackError } from "@/server/logic/events/core";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type {
  ReadonlyInventory,
  ReadonlyWearing,
} from "@/shared/ecs/gen/components";
import { Inventory, SelectedItem, Wearing } from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import type {
  ItemAndCount,
  ItemBag,
  ItemSet,
  ItemSlot,
  OwnedItemReference,
  ReadonlyItemAndCount,
} from "@/shared/ecs/gen/types";
import type {
  CollectEvent,
  FirehoseEvent,
  WearingEvent,
} from "@/shared/firehose/events";
import type {
  InventoryAssignmentPattern,
  MergeIndex,
  ReadonlyOwnedItems,
  TakeOptions,
} from "@/shared/game/inventory";
import {
  determineTakePattern,
  findBestIndexForMerge,
  getMaxCombinable,
  isCombinableItems,
  isValidInventoryItemCount,
  patternAsSingleRef,
  refPk,
} from "@/shared/game/inventory";
import {
  addToBag,
  bagContains,
  bagRefTo,
  countOf,
  createBag,
  equalItems,
  getAssignmentItemByRef,
  getBagItemByRef,
  getContainerItemByRef,
  setAssignmentItemByRef,
  setBagItemByRef,
  setContainerItemByRef,
  takeFromBag,
} from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { onlyMapValue } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";

export class PlayerInventoryEditor {
  constructor(
    private readonly context: { publish(event: FirehoseEvent): void },
    public readonly entity: Delta
  ) {
    this.entity.addHook(() => {
      const newSelected = this.get(this.entity.inventory()?.selected);
      if (
        !equalItems(this.entity.selectedItem()?.item?.item, newSelected?.item)
      ) {
        this.entity.setSelectedItem(SelectedItem.create({ item: newSelected }));
      }
    });
  }

  get id() {
    return this.entity.id;
  }

  inventory(): ReadonlyInventory {
    return this.entity.inventory() ?? Inventory.create();
  }

  mutableInventory() {
    return this.entity.mutableInventory();
  }

  wearing(): ReadonlyWearing {
    return this.entity.wearing() ?? Wearing.create();
  }

  private mutableWearing() {
    return this.entity.mutableWearing();
  }

  tryUseCharge(ref: OwnedItemReference): boolean {
    const item = this.get(ref);
    if (!item) {
      return false;
    }

    if (item.item.chargeTime == undefined) {
      return true;
    }

    const chargesAt = item.item.chargesAt ?? 0;
    const chargeTime = item.item.chargeTime;
    if (secondsSinceEpoch() < chargesAt) {
      return false;
    }

    this.set(
      ref,
      countOf(
        item.item.id,
        {
          ...item.item.payload,
          [attribs.chargesAt.id]: secondsSinceEpoch() + chargeTime,
        },
        item.count
      )
    );
    return true;
  }

  trySpendCurrency(currency: BiomesId, amount: bigint) {
    ok(amount >= 0n, `Tried to spend negative currency ${amount}`);
    if (amount === 0n) {
      return true;
    }
    const desired = countOf(currency, amount);
    if (!bagContains(this.inventory().currencies, desired)) {
      return false;
    }
    return takeFromBag(this.mutableInventory().currencies, desired);
  }

  giveCurrency(currency: BiomesId, amount: bigint) {
    ok(amount >= 0n, `Tried to give negative currency ${amount}`);
    if (amount === 0n) {
      return;
    }
    addToBag(this.mutableInventory().currencies, countOf(currency, amount));
  }

  _get(ref: OwnedItemReference | undefined): ItemAndCount | undefined {
    if (!ref) {
      return;
    }
    switch (ref.kind) {
      case "item":
        return getContainerItemByRef(this.inventory().items, ref);
      case "hotbar":
        return getContainerItemByRef(this.inventory().hotbar, ref);
      case "wearable":
        return getAssignmentItemByRef(this.wearing().items, ref);
      case "currency":
        return getBagItemByRef(this.inventory().currencies, ref);
      default:
        assertNever(ref);
    }
  }

  asOwnedItems(): ReadonlyOwnedItems {
    return {
      inventory: this.inventory(),
      wearing: this.wearing(),
      selected_item: this.entity.selectedItem(),
    };
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

  getSelected(): ItemAndCount | undefined {
    const ref = this.inventory().selected;
    if (ref) {
      return this.get(ref);
    }
  }

  setSelected(ref: OwnedItemReference) {
    this.mutableInventory().selected = ref;
  }

  find(item: ItemAndCount): [OwnedItemReference, ItemAndCount] | undefined {
    const ref = patternAsSingleRef(
      this.determineTakePattern(createBag(item), {
        respectPayload: false,
        allowTypeMatch: false,
      })
    );
    if (ref) {
      return [ref, this.get(ref)!];
    }
  }

  set(ref: OwnedItemReference, value: ItemAndCount | undefined) {
    if (value === undefined) {
      switch (ref.kind) {
        case "item":
          ok(ref.idx >= 0 && ref.idx < this.inventory().items.length);
          this.mutableInventory().items[ref.idx] = undefined;
          break;
        case "hotbar":
          ok(ref.idx >= 0 && ref.idx < this.inventory().hotbar.length);
          this.mutableInventory().hotbar[ref.idx] = undefined;
          break;
        case "wearable":
          this.mutableWearing().items.delete(ref.key);
          break;
        case "currency":
          this.mutableInventory().currencies.delete(ref.key);
          break;
        default:
          assertNever(ref);
      }
      return;
    }
    // Handle non-stackable items.
    switch (ref.kind) {
      case "currency":
        ok(value.item.isCurrency, `Item ${value.item.id} is not a currency`);
        setBagItemByRef(this.mutableInventory().currencies, ref, value);
        return;
    }
    if (value.count === 0n) {
      // Count of nothing, clear the slot.
      this.set(ref, undefined);
      return;
    }
    // Handle stackable things/slots.
    ok(
      isValidInventoryItemCount(value.item, value.count),
      `Invalid inventory count ${value.count}`
    );
    switch (ref.kind) {
      case "item":
        ok(
          value.item.stackable,
          `Item ${value.item.id} is not an inventory item`
        );
        setContainerItemByRef(this.mutableInventory().items, ref, value);
        break;
      case "hotbar":
        ok(
          value.item.stackable,
          `Item ${value.item.id} is not an inventory item`
        );
        setContainerItemByRef(this.mutableInventory().hotbar, ref, value);
        break;
      case "wearable":
        ok(
          findItemEquippableSlot(value.item, [ref.key]),
          `Item ${value.item.id} is not wearable in slot ${ref.key}`
        );
        setAssignmentItemByRef(this.mutableWearing().items, ref, value);
        this.context.publish(<WearingEvent>{
          kind: "wearing",
          entityId: this.id,
          bag: itemBagToString(createBag(value)),
        });
        break;
      default:
        assertNever(ref);
    }
  }

  merge(ref: OwnedItemReference, value: ItemAndCount) {
    const existing = this.get(ref);
    if (existing !== undefined) {
      ok(
        ref.kind === "currency" ||
          isCombinableItems({ from: value, to: existing })
      );
      this.set(ref, {
        ...existing,
        count: existing.count + value.count,
      });
    } else {
      this.set(ref, value);
    }
  }

  // Find the best ref for merge, returning the reference as well
  // as the amount [from combinableAmount] for the slot.
  // You should not use this method, typically use: findSlotToMergeIntoInventory
  private findBestRefForMerge(
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
    const selected = this.inventory().selected;
    if (selected.kind === "hotbar") {
      hotbarSelectedIdx = selected.idx;
      if (!this.inventory().hotbar[hotbarSelectedIdx]) {
        avoidCandidates.add(refPk(selected));
      }
    }

    const hotbarRef = noHotbar
      ? undefined
      : findBestIndexForMerge(
          "hotbar",
          this.inventory().hotbar,
          combinableAmount,
          avoidCandidates
        );
    const itemsRef = noInventory
      ? undefined
      : findBestIndexForMerge(
          "item",
          this.inventory().items,
          combinableAmount,
          avoidCandidates
        );

    // Prefer any slot with existing items
    if (
      hotbarRef &&
      hotbarRef[0].kind === "hotbar" &&
      this.inventory().hotbar[hotbarRef[0].idx]
    ) {
      return hotbarRef;
    }
    if (
      itemsRef &&
      itemsRef[0].kind === "item" &&
      this.inventory().items[itemsRef[0].idx]
    ) {
      return itemsRef;
    }

    // Prefer hotbar over inventory
    if (hotbarRef) {
      return hotbarRef;
    }
    if (itemsRef) {
      return itemsRef;
    }

    if (
      !noHotbar &&
      hotbarSelectedIdx !== undefined &&
      !this.inventory().hotbar[hotbarSelectedIdx] &&
      !used?.has(refPk(selected))
    ) {
      // We avoided the empty selected slot earlier, but it's the only option now so take it.
      const usable = combinableAmount(
        this.inventory().hotbar[hotbarSelectedIdx]
      );
      if (usable > 0n) {
        return [selected, usable];
      }
    }
  }

  private findSlotToMergeIntoInventory(
    itemAndCount: ItemAndCount,
    options: {
      spreadOk?: boolean;
      noHotbar?: boolean;
      noInventory?: boolean;
    },
    used?: Set<string>
  ): InventoryAssignmentPattern | undefined {
    if (itemAndCount.item.isCurrency) {
      return [
        [
          {
            kind: "currency",
            ...bagRefTo(itemAndCount.item),
          },
          itemAndCount,
        ],
      ];
    }
    if (!options.spreadOk) {
      // Attempt to find a slot that'll take the full item.
      const ref = this.findBestRefForMerge(itemAndCount, options, used);
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
      const ref = this.findBestRefForMerge(
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

  private determineIncompleteGivePattern(input: ItemBag): {
    pattern?: InventoryAssignmentPattern;
    missing: ItemBag;
  } {
    const missing = createBag();
    let used = new Set<string>();
    const pattern: InventoryAssignmentPattern = [];
    for (const itemAndCount of input.values()) {
      const newUsed = new Set<string>(used);
      const subPattern = this.findSlotToMergeIntoInventory(
        itemAndCount,
        {
          spreadOk: true,
        },
        newUsed
      );
      if (subPattern === undefined) {
        addToBag(missing, itemAndCount);
        continue;
      }
      used = newUsed;
      pattern.push(...subPattern);
    }
    return {
      pattern,
      missing,
    };
  }

  private determineGivePattern(
    input: ItemBag
  ): InventoryAssignmentPattern | undefined {
    const used = new Set<string>();
    const pattern: InventoryAssignmentPattern = [];
    for (const itemAndCount of input.values()) {
      const subPattern = this.findSlotToMergeIntoInventory(
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

  private partitionBag(
    input: ItemBag
  ): [recipes: ItemSet, itemBag: ItemBag, currencyBag: ItemBag] {
    const recipes: ItemSet = new Map();
    const itemBag: ItemBag = new Map();
    const currencyBag: ItemBag = new Map();
    for (const [k, v] of input) {
      if (v.item.isCurrency) {
        currencyBag.set(k, v);
      } else if (v.item.isRecipe) {
        recipes.set(k, v.item);
      } else {
        itemBag.set(k, v);
      }
    }
    return [recipes, itemBag, currencyBag];
  }

  private giveRecipes(recipes: ItemSet) {
    if (recipes.size > 0) {
      for (const [pk, item] of recipes) {
        if (this.entity.recipeBook()?.recipes.has(pk)) {
          continue;
        }
        this.entity.mutableRecipeBook().recipes.set(pk, item);
        this.context.publish({
          kind: "recipeUnlocked",
          entityId: this.entity.id,
          recipe: item,
        });
      }
    }
  }

  giveOrThrow(input: ItemBag, mined?: boolean) {
    if (!input.size) {
      return;
    }
    const [recipes, itemBag, currencyBag] = this.partitionBag(input);

    this.giveRecipes(recipes);
    if (itemBag.size > 0) {
      const itemOutPattern = this.determineGivePattern(itemBag);
      if (!itemOutPattern) {
        throw new RollbackError("No room in inventory");
      }
      this.give(itemOutPattern, mined);
    }

    if (currencyBag.size > 0) {
      const currencyOutPattern = this.determineGivePattern(currencyBag);
      ok(currencyOutPattern, "Expected currencies to be giveable");
      this.give(currencyOutPattern, mined);
    }
  }

  giveWithInventoryOverflow(input: ItemBag) {
    if (!input.size) {
      return;
    }
    const [recipes, itemBag, currencyBag] = this.partitionBag(input);

    this.giveRecipes(recipes);
    if (itemBag.size > 0) {
      const { pattern, missing } = this.determineIncompleteGivePattern(itemBag);
      if (pattern) {
        this.give(pattern);
      }
      if (missing.size > 0) {
        this.giveIntoOverflow(missing);
      }
    }

    if (currencyBag.size > 0) {
      const currencyOutPattern = this.determineGivePattern(currencyBag);
      ok(currencyOutPattern, "Expected currencies to be giveable");
      this.give(currencyOutPattern);
    }
  }

  giveIntoOverflow(input: ItemBag) {
    if (!input.size) {
      return;
    }
    const [_, itemBag, currencyBag] = this.partitionBag(input);
    addToBag(this.mutableInventory().overflow, itemBag);
    addToBag(this.mutableInventory().overflow, currencyBag);
    this.context.publish({
      kind: "overflowedToInbox",
      entityId: this.entity.id,
      bag: itemBagToString(input),
    });
  }

  private give(pattern?: InventoryAssignmentPattern, mined?: boolean) {
    if (!pattern?.length) {
      return;
    }
    this.context.publish(<CollectEvent>{
      kind: "collect",
      entityId: this.entity.id,
      mined,
      bag: itemBagToString(
        createBag(...pattern.map(([_, itemAndCount]) => itemAndCount))
      ),
    });
    let wearing: ItemBag | undefined;
    for (const [ref, items] of pattern) {
      if (ref.kind === "wearable") {
        wearing ??= createBag();
        addToBag(wearing, items);
      }
      this.merge(ref, items);
    }

    if (wearing !== undefined) {
      this.context.publish(<WearingEvent>{
        kind: "wearing",
        entityId: this.entity.id,
        bag: itemBagToString(wearing),
      });
    }
  }

  determineTakePattern(
    needed: ItemBag,
    takeOptions: TakeOptions = {
      respectPayload: true,
    }
  ): InventoryAssignmentPattern | undefined {
    return determineTakePattern(this.asOwnedItems(), needed, takeOptions);
  }

  patternForTakeFromSelected(
    needed: ItemBag
  ): InventoryAssignmentPattern | undefined {
    if (needed.size > 1) {
      // Selected is only ever one item, so cannot succeed.
      return undefined;
    }
    const allocation: InventoryAssignmentPattern = [];
    if (needed.size === 0) {
      return allocation;
    }
    // Check the single selected item meets requirements.
    const [item] = needed.values();
    const ref = this.inventory().selected;
    const selected = this.get(ref);
    if (!selected) {
      return undefined;
    }
    if (!equalItems(selected.item, item.item) || selected.count < item.count) {
      return undefined;
    }
    return [[ref, item]];
  }

  attemptTakeFromSlot(ref: OwnedItemReference, items: ItemAndCount): boolean {
    if (!this.canTakeFromSlot(ref, items)) {
      return false;
    }

    const existing = this.get(ref);
    ok(existing);
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

  canTakeFromSlot(ref: OwnedItemReference, items: ItemAndCount): boolean {
    const existing = this.get(ref);
    if (existing === undefined) {
      return false;
    }
    if (!equalItems(existing.item, items.item)) {
      return false;
    }

    if (existing.count === items.count) {
      return true;
    }
    if (
      !isValidInventoryItemCount(existing.item, existing.count - items.count)
    ) {
      return false;
    }
    return true;
  }

  takeFromSlot(ref: OwnedItemReference, items: ItemAndCount) {
    ok(
      this.attemptTakeFromSlot(ref, items),
      "Tried to take more than available"
    );
  }

  canTake(pattern: InventoryAssignmentPattern) {
    for (const [ref, items] of pattern) {
      if (!this.canTakeFromSlot(ref, items)) {
        return false;
      }
    }

    return true;
  }

  take(pattern?: InventoryAssignmentPattern) {
    if (pattern === undefined) {
      return;
    }
    for (const [ref, items] of pattern) {
      ok(
        this.attemptTakeFromSlot(ref, items),
        "Tried to take more than available."
      );
    }
  }

  tryTakeBag(
    input: ItemBag | undefined,
    takeOptions: TakeOptions = {
      respectPayload: true,
    }
  ): boolean {
    if (!input || input.size === 0) {
      return true;
    }
    const pattern = this.determineTakePattern(input, takeOptions);
    if (!pattern) {
      return false;
    }
    this.take(pattern);
    return true;
  }

  takeOrThrow(
    input: ItemBag,
    takeOptions: TakeOptions = {
      respectPayload: true,
    }
  ) {
    if (!this.tryTakeBag(input, takeOptions)) {
      throw new RollbackError("Not enough items to take");
    }
  }

  moveIntoOverflow(bag: ItemBag): boolean {
    const takePattern = this.determineTakePattern(bag);
    if (!takePattern) {
      return false;
    }
    this.take(takePattern);
    addToBag(this.mutableInventory().overflow, bag);
    return true;
  }

  moveFromOverflow(bag: ItemBag, to?: OwnedItemReference): boolean {
    if (to && this.get(to) === undefined && bag.size === 1) {
      if (!takeFromBag(this.mutableInventory().overflow, bag)) {
        return false;
      }
      this.set(to, onlyMapValue(bag));
      return true;
    }
    const pattern = this.determineGivePattern(bag);
    if (!pattern) {
      return false;
    }
    if (!takeFromBag(this.mutableInventory().overflow, bag)) {
      return false;
    }
    this.give(pattern);
    return true;
  }
}
