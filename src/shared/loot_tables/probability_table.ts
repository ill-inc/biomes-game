import type {
  GameStateContext,
  GameStatePredicated,
} from "@/shared/loot_tables/indexing";
import { sampleGameStatePredicated } from "@/shared/loot_tables/indexing";
import { DefaultMap, compactMap } from "@/shared/util/collections";
import { sum } from "lodash";

// Would be nice to define these in zod
export type ProbabilityTableEntry<T> = {
  value: T;
  probability: number;
};
type FilteredProbabilityTable<T> = ProbabilityTableEntry<T>[];
export type ProbabilityTable<T> = GameStatePredicated<ProbabilityTableEntry<T>>;

export function rollProbabilityTable<T>(
  table: ProbabilityTable<T>,
  gameStateContext?: GameStateContext,
  nullUnderOne?: boolean
) {
  // Filter by context, then roll directly
  const filteredTable = sampleGameStatePredicated(table, gameStateContext);
  return rollFilteredProbabilityTable(filteredTable, nullUnderOne);
}

// Roll the table directly
export function rollFilteredProbabilityTable<T>(
  table: FilteredProbabilityTable<T>,
  nullUnderOne?: boolean
) {
  let total = sum(table.map((e) => e.probability));
  if (total < 1 && nullUnderOne) {
    // Null under one means that we return null if the probabilities in the
    // table don't add to at least one
    // This is so we can have an implicit empty roll, and define
    // rolls in terms of probabilities directly, since what is in a roll
    // is dynamic.
    // NOTE: items' probabilities will be lower than their definition
    // when the sum is over 1. to combat this, we could start making
    // independent drops when the probability is over 1, but deal with that later
    total = 1;
  }

  const roll = (process.env.MOCHA_TEST ? 0.5 : Math.random()) * total;

  let runSum = 0;
  for (const { value, probability } of table) {
    if (roll <= runSum + probability) {
      return value;
    }
    runSum += probability;
  }
  return null;
}

// Probability tables with multiple, independent slots
export type SlottedProbabilityTableEntry<T, S> = {
  value: T;
  probability: number;
  slot?: S;
};
export type SlottedProbabilityTable<T, S> = GameStatePredicated<
  SlottedProbabilityTableEntry<T, S>
>;

export function rollSlottedProbabilityTable<T, S>(
  table: SlottedProbabilityTable<T, S>,
  gameStateContext?: GameStateContext,
  slots?: (S | undefined)[],
  nullUnderOne?: boolean
): T[] {
  // Filter by context
  const contextTable = sampleGameStatePredicated(table, gameStateContext);
  // Group by slot
  const slotTable = new DefaultMap<
    S | undefined,
    SlottedProbabilityTableEntry<T, S>[]
  >(() => []);
  for (const entry of contextTable) {
    slotTable.get(entry.slot).push(entry);
  }
  if (slots === undefined) {
    // If no slot is specified, roll all slots
    slots = [...slotTable.keys()];
  }
  return compactMap(slots, (v) =>
    rollFilteredProbabilityTable(slotTable.get(v), nullUnderOne)
  );
}

export function withFallbackProbabilityTable<T>(
  table: ProbabilityTable<T>,
  fallbackTable: ProbabilityTable<T>,
  rollContext?: GameStateContext
) {
  // Combine the two tables given a specific context
  const baseEntries = sampleGameStatePredicated(table, rollContext);
  const totalProbability = sum(baseEntries.map((e) => e.probability));
  if (totalProbability >= 1) {
    return baseEntries;
  }
  const fallbackEntries = sampleGameStatePredicated(fallbackTable, rollContext);
  const fallbackTotalProbability = sum(
    fallbackEntries.map((e) => e.probability)
  );
  const fallbackProbabilityScale =
    (1 - totalProbability) / fallbackTotalProbability;
  return [
    ...baseEntries,
    ...fallbackEntries.map((e) => ({
      ...e,
      probability: e.probability * fallbackProbabilityScale,
    })),
  ];
}
