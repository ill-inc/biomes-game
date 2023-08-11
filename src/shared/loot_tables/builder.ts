import { compact } from "lodash";
import { DefaultMap } from "@/shared/util/collections";
import type {
  GameStatePredicated,
  DiscreteGameStatePredicate,
  RangeGameStatePredicated,
  DiscreteGameStatePredicated,
} from "@/shared/loot_tables/indexing";
import { isDiscreteGameStatePredicate } from "@/shared/loot_tables/indexing";
import type { GameStatePredicate } from "@/shared/loot_tables/predicates";
import { log } from "@/shared/logging";
import { getExecutablePredicates } from "@/shared/loot_tables/predicates";

export type GameStatePredicatedValues<V> = {
  predicates: GameStatePredicate[];
  values?: V[];
  value?: V;
};

export function constructGameStatePredicated<V>(
  inputPredicatedValues: GameStatePredicatedValues<V>[],
  defaults: GameStatePredicate[] = [],
  byPredicates?: DiscreteGameStatePredicate["kind"][]
): GameStatePredicated<V> {
  // Convert values/value into a single values array
  const predicatedValues = inputPredicatedValues.map((v) => ({
    predicates: getExecutablePredicates(v.predicates, defaults),
    values: compact([...(v.values ?? []), v.value]),
  }));

  if (byPredicates === undefined) {
    // No predicate order defined, so determine one
    // Count the number of unique values for each discrete predicate
    // Construct a tree, starting with the most unique values
    const discreteSets = new DefaultMap<
      DiscreteGameStatePredicate["kind"],
      Set<any>
    >(() => new Set());
    for (const { predicates } of predicatedValues) {
      for (const predicate of predicates) {
        if (!isDiscreteGameStatePredicate(predicate)) {
          continue;
        }
        discreteSets.get(predicate.kind).add(predicate.value);
      }
    }
    byPredicates = [...discreteSets.keys()].sort(
      (a, b) => discreteSets.get(b).size - discreteSets.get(a).size
    );
  }
  if (byPredicates.length === 0) {
    // Recursion base case: no more discrete predicates to sort by.
    // Check if we have range or discrete predicates
    // leftover.
    // (Warn if discrete exist)
    let hasRange = false;
    for (const { predicates } of predicatedValues) {
      for (const predicate of predicates) {
        if (isDiscreteGameStatePredicate(predicate)) {
          log.warn("Discrete predicate leftover", predicate);
        } else {
          hasRange = true;
        }
      }
    }
    if (hasRange) {
      return <RangeGameStatePredicated<V>>{
        kind: "range",
        entries: predicatedValues.map(({ predicates, values }) => ({
          predicates,
          values,
        })),
      };
    }
    return predicatedValues.flatMap((v) => compact(v.values));
  }

  // Pick the next discrete predicate to sort by
  // filter these predicates out and recurse
  const predicate = byPredicates[0];
  const bucketed = new DefaultMap<any, GameStatePredicatedValues<V>[]>(
    () => []
  );
  const invertBuckets = new DefaultMap<any, GameStatePredicatedValues<V>[]>(
    () => []
  );
  const unpredicatedValues = [];
  for (const { predicates, values } of predicatedValues) {
    const matchedPredicates = predicates.filter(
      (p) => p.kind === predicate && isDiscreteGameStatePredicate(p)
    );
    if (matchedPredicates.length === 0) {
      unpredicatedValues.push({ predicates, values });
      continue;
    } else if (matchedPredicates.length > 1) {
      log.warn(`Multiple predicates matched: ${matchedPredicates}`);
    }
    const predVal = matchedPredicates[0].value;
    const invert = !!matchedPredicates[0].invert;
    const recursivePredicates = predicates.filter(
      (p) => p.kind !== predicate || !isDiscreteGameStatePredicate(p)
    );
    if (invert) {
      invertBuckets.get(predVal).push({
        predicates: recursivePredicates,
        values,
      });
    } else {
      bucketed.get(predVal).push({
        predicates: recursivePredicates,
        values,
      });
    }
  }

  // For every bucket, recurse
  const map = new Map();
  for (const [key, values] of bucketed) {
    map.set(
      key,
      constructGameStatePredicated(values, defaults, byPredicates.slice(1))
    );
  }
  const invertedMap = new Map();
  for (const [key, values] of invertBuckets) {
    invertedMap.set(
      key,
      constructGameStatePredicated(values, defaults, byPredicates.slice(1))
    );
  }
  const unpredicated = constructGameStatePredicated(
    unpredicatedValues,
    defaults,
    byPredicates.slice(1)
  );
  if (map.size === 0 && invertedMap.size === 0) {
    // If the only entry is null, then we can just return the recursed null case
    return unpredicated;
  }
  return <DiscreteGameStatePredicated<DiscreteGameStatePredicate, V>>{
    kind: "discrete",
    predicate,
    map,
    invertedMap,
    unpredicated,
  };
}
