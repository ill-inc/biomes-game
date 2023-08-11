import { z } from "zod";
import { zBiomesId } from "@/shared/ids";
import type {
  SlottedProbabilityTable,
  SlottedProbabilityTableEntry,
} from "@/shared/loot_tables/probability_table";
import { zGameStatePredicate } from "@/shared/loot_tables/predicates";
import type { BagSpec } from "@/shared/game/bag_spec";
import { zBagSpec } from "@/shared/game/bag_spec";

export const zLootTableSlot = z.enum(["seedBlock"]).optional();
export type LootTableSlot = z.infer<typeof zLootTableSlot>;

export const zLootProbability = z.union([
  z.number(),
  z.enum([
    "never",
    "mythic",
    "legendary",
    "epic",
    "rare",
    "uncommon",
    "common",
    "very common",
    "guaranteed",
  ]),
]);
export type LootProbability = z.infer<typeof zLootProbability>;

export const zLootTableEntrySpec = z.object({
  value: zBagSpec,
  probability: zLootProbability,
  slot: zLootTableSlot.optional(),
});
export type LootTableEntrySpec = z.infer<typeof zLootTableEntrySpec>;

export const zLootTableSpec = z
  .object({
    predicates: z.array(zGameStatePredicate),
    values: zLootTableEntrySpec.array(),
  })
  .array();
export type LootTableSpec = z.infer<typeof zLootTableSpec>;

// Make sure loot table def conforms to probability table
export type LootTableEntry = SlottedProbabilityTableEntry<
  BagSpec,
  LootTableSlot
>;
export type LootTable = SlottedProbabilityTable<BagSpec, LootTableSlot>;

const _assertLootTableSpec =
  0 as unknown as LootTable satisfies SlottedProbabilityTable<
    BagSpec,
    LootTableSlot
  >;

export const zDropTable = z
  .tuple([zLootProbability, z.tuple([zBiomesId, z.number()]).array()])
  .array();

export type DropTable = z.infer<typeof zDropTable>;
