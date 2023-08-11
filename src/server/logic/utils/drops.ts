import type {
  EventContext,
  InvolvedKeysFor,
  InvolvedSpecification,
  NewIds,
} from "@/server/logic/events/core";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  Expires,
  GrabBag,
  LooseItem,
  Position,
} from "@/shared/ecs/gen/components";
import type { Entity } from "@/shared/ecs/gen/entities";
import type * as ecs from "@/shared/ecs/gen/types";
import type { GrabBagFilter, ItemAndCount } from "@/shared/ecs/gen/types";
import { createInventorySafeBag } from "@/shared/game/inventory";
import type {
  DropTable,
  LootTable,
  LootTableEntry,
  LootTableSlot,
} from "@/shared/game/item_specs";
import {
  bagSpecToBag,
  createBag,
  lootProbabilityToNumber,
} from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import type { GameStatePredicatedValues } from "@/shared/loot_tables/builder";
import { constructGameStatePredicated } from "@/shared/loot_tables/builder";
import type { GameStatePredicate } from "@/shared/loot_tables/predicates";
import { ok } from "assert";

export const MAX_DROPS_FOR_SPEC = 10;

export function legacyDropSpecToLootEntries(
  dropSpec: DropTable,
  slot?: LootTableSlot
): LootTableEntry[] {
  return dropSpec.map(([probability, bag]) => {
    return {
      probability: lootProbabilityToNumber(probability),
      value: bag,
      slot,
    };
  });
}

export const blockDropTable = bikkieDerived("blockDropTable", () => {
  const blocks = getBiscuits("/blocks");
  const lootEntries: GameStatePredicatedValues<LootTableEntry>[] = [];
  for (const block of blocks) {
    const blockPred: GameStatePredicate = {
      kind: "block",
      value: block.id,
    };
    const preferredPred: GameStatePredicate = {
      kind: "toolDestroyerClass",
      value: block.preferredDestroyerClass ?? 0,
    };
    const unpreferredPred = {
      ...preferredPred,
      invert: true,
    };
    const seedPredicate: GameStatePredicate = {
      kind: "seedBlock",
      value: true,
    };
    const userPlacedPredicate: GameStatePredicate = {
      kind: "seedBlock",
      value: false,
    };
    const noMuckPredicate: GameStatePredicate = {
      kind: "notMuck",
    };
    const muckPredicate: GameStatePredicate = {
      kind: "inMuck",
    };
    // Legacy drop tables
    // 5 tables:
    // 1. drop. default
    // 2. preferredDrop. preferred tool
    // 3. muckDrop. drop in muck
    // 4. muckPreferredDrop. drop in muck with preferred tool
    // 5. seedDrop. extra drop, usually bling
    // Predicates are different depending on which tables are defined.
    // Each table, except for seedDrop, are mutually exclusive,
    // so when one is defined, the others must define the inverse predicate
    const runningPredicates: GameStatePredicate[] = [blockPred, seedPredicate];

    // If muck preferred exists, then we have a split between
    if (block.muckPreferredDrop) {
      lootEntries.push({
        predicates: [...runningPredicates, muckPredicate, preferredPred],
        values: legacyDropSpecToLootEntries(block.muckPreferredDrop),
      });
      if (block.muckDrop) {
        lootEntries.push({
          predicates: [...runningPredicates, muckPredicate, unpreferredPred],
          values: legacyDropSpecToLootEntries(block.muckDrop),
        });
      }
      runningPredicates.push(noMuckPredicate);
    } else if (block.muckDrop) {
      // No muck preferred drop, but muckdrop exists
      lootEntries.push({
        predicates: [...runningPredicates, muckPredicate],
        values: legacyDropSpecToLootEntries(block.muckDrop),
      });
      // Other tables must predicate on the no muck case if we made this tables
      runningPredicates.push(noMuckPredicate);
    }

    // If a preferred drop exists, then we have a split between preferred and unpreferred drops
    if (block.preferredDrop) {
      lootEntries.push({
        predicates: [...runningPredicates, preferredPred],
        values: legacyDropSpecToLootEntries(block.preferredDrop),
      });
      runningPredicates.push(unpreferredPred);
    }

    if (block.drop) {
      lootEntries.push(
        ...legacyDropSpecToLootEntries(block.drop).map((entry) => ({
          predicates: runningPredicates,
          value: entry,
        }))
      );
    }

    // Seed drops are independent
    if (block.seedDrop) {
      lootEntries.push(
        ...legacyDropSpecToLootEntries(block.seedDrop, "seedBlock").map(
          (entry) => ({
            predicates: [blockPred, seedPredicate],
            value: entry,
          })
        )
      );
    }

    // User placed. Use the drop table if it exists, otherwise drop the original block
    if (block.userPlacedDrop) {
      lootEntries.push({
        predicates: [blockPred, userPlacedPredicate],
        values: legacyDropSpecToLootEntries(block.userPlacedDrop),
      });
    } else {
      lootEntries.push({
        predicates: [blockPred, userPlacedPredicate],
        value: {
          probability: 1,
          value: [[block.id, 1]],
        },
      });
    }
  }
  const lootTree: LootTable = constructGameStatePredicated(lootEntries);
  return lootTree;
});

export function rollSpec(spec: DropTable): ecs.ItemBag {
  if (spec.length === 1) {
    return bagSpecToBag(spec[0][1]) ?? createBag();
  } else if (spec.length > 1) {
    const occuranceTotal = spec.reduce(
      (acc, [prob, _]) => acc + lootProbabilityToNumber(prob),
      0
    );
    let choice =
      (process.env.MOCHA_TEST ? 0.5 : Math.random()) * occuranceTotal;
    for (const [prob, items] of spec) {
      const count = lootProbabilityToNumber(prob);
      if (choice > count) {
        choice -= count;
        continue;
      }
      return bagSpecToBag(items) ?? createBag();
    }
  }
  return createBag();
}

export function createDropsForBag<
  TInvolvedSpecification extends InvolvedSpecification,
  TKey extends InvolvedKeysFor<TInvolvedSpecification, NewIds>
>(
  context: EventContext<TInvolvedSpecification>,
  key: TKey,
  bag: ecs.ItemBag,
  origin: ecs.Vec3f,
  mined: boolean,
  dropFilter?: GrabBagFilter
) {
  const dropIds = context.results[key] as BiomesId[];
  ok(dropIds.length >= bag.size);
  if (bag.size === 0) {
    // No drops.
    return;
  } else if (bag.size === 1) {
    context.create(
      newDrop(
        dropIds.pop()!,
        origin,
        mined,
        [bag.values().next().value],
        dropFilter
      )
    );
  } else {
    // Choose random offset.
    let phi = Math.random() * 2 * Math.PI;
    const deltaPhi = (2 * Math.PI) / bag.size;

    for (const itemAndCount of bag.values()) {
      // Drop radius is within 0.4 so the drop wouldn't
      // touch the edge of the voxel and trigger physics.
      const r = Math.random() * 0.399;
      const dropPos: ecs.Vec3f = [
        origin[0] + Math.cos(phi) * r,
        origin[1],
        origin[2] + Math.sin(phi) * r,
      ];
      context.create(
        newDrop(dropIds.pop()!, dropPos, mined, [itemAndCount], dropFilter)
      );
      phi += deltaPhi;
    }
  }
}

export function newDrop(
  id: BiomesId,
  pos: ecs.Vec3f,
  mined: boolean,
  items: ItemAndCount[],
  filter?: GrabBagFilter
): Entity {
  const bag = createInventorySafeBag(...items);
  ok(bag && bag.size > 0, "Cannot create empty drop!");
  return {
    id,
    grab_bag: GrabBag.create({
      slots: bag,
      mined,
      filter,
    }),
    position: Position.create({ v: pos }),
    expires: Expires.create({
      trigger_at: secondsSinceEpoch() + CONFIG.gameDropExpirationSecs,
    }),
    loose_item: LooseItem.create({
      item: items[0].item,
    }),
  };
}
