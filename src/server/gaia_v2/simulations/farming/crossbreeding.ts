import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import type { CrossbreedChance } from "@/shared/game/farming";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import type { ProbabilityTable } from "@/shared/loot_tables/probability_table";
import { DefaultMap } from "@/shared/util/collections";
import type { CrossbreedEntry } from "@/server/gaia_v2/simulations/farming/crossbreed_specs";
import { farmLog } from "@/server/gaia_v2/simulations/farming/util";

// Remember, these are additive.
// For a 2 seed crossbreed, this can be x4 the value if a plant is surrounded
// 3 seeds -> x2
// 4 seeds -> x1
// We should play around with these when we have more complex crossbreeds
const crossbreedChanceValues: { [Property in CrossbreedChance]: number } = {
  rare: 0.01,
  low: 0.05,
  medium: 0.1,
  high: 0.2,
  guaranteed: 1.0,
};

const crossbreedMap = bikkieDerived("crossbreedMap", () => {
  const seeds = getBiscuits("/items/seed");
  const map = new DefaultMap<BiomesId, CrossbreedEntry[]>(() => []);
  for (const seed of seeds) {
    if (seed.deprecated || seed.enabled === false) {
      continue;
    }
    const crossbreeds = seed.farming?.crossbreeds;
    if (crossbreeds) {
      for (const cross of crossbreeds) {
        for (const crossSeed of cross.seeds) {
          map.get(crossSeed).push({
            id: seed.id,
            seeds: cross.seeds,
            chance: crossbreedChanceValues[cross.chance],
          });
        }
      }
    }
  }
  return map;
});

export function crossbreedDropTable(
  primarySeed: BiomesId,
  otherSeeds: BiomesId[],
  // Bias all crossbreeds with an additional chance.
  // This increases the chance of getting a crossbreed, as well as
  // crossbreed distribution a bit more uniform, making "rarer" crossbreeds
  // more common.
  additionalChance?: number
) {
  const results: ProbabilityTable<BiomesId> = [];
  const seeds = [primarySeed, ...otherSeeds];

  farmLog("    [Potential Crossbreeds]", 4);
  for (const entry of crossbreedMap().get(primarySeed)) {
    // Find all permutations of the seeds that match the entry
    const matches = countPermutations(seeds, entry.seeds);
    if (matches > 0) {
      // TODO: Maybe we should include a multi drop at a lower chance?
      const prob = entry.chance * matches;
      results.push({
        value: entry.id,
        probability: prob + (additionalChance ?? 0),
      });
    }
    farmLog(
      `        ${matches > 0 ? `✓x${matches}` : "   "} ${
        anItem(entry.id).displayName
      } (${entry.seeds.map((id) => anItem(id).displayName).join(", ")})`,
      4
    );
  }
  return results;
}

// Counts number of times the ref occurs with unique values in val:
// countPermutations([1, 2], [1, 2]) = 1
// countPermutations([1, 2, 2, 2], [1, 2]) = 4
export function countPermutations(val: BiomesId[], ref: BiomesId[]) {
  let count = 0;
  if (ref.length === 0) {
    return 1;
  }
  if (val.length === 0) {
    return 0;
  }
  const first = val[0];
  const firstRefIndex = ref.indexOf(first);
  if (firstRefIndex === -1) {
    return 0;
  }

  // Count the matched permutations with using this val and matching ref
  const refWithoutIndex = ref.slice();
  refWithoutIndex.splice(firstRefIndex, 1);
  count += countPermutations(val.slice(1), refWithoutIndex);
  // Count the matched permutations without using this ref
  count += countPermutations(val.slice(1), ref);
  return count;
}
