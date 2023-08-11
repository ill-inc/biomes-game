import { flatMap, every } from "lodash";
import { assertNever } from "@/shared/util/type_helpers";
import type { ExecutableGameStatePredicate } from "@/shared/loot_tables/predicates";

// Range vs Discrete is an implementation detail
export type RangeGameStatePredicate = Extract<
  ExecutableGameStatePredicate,
  { min?: number; max?: number }
>;

export type DiscreteGameStatePredicate = Extract<
  ExecutableGameStatePredicate,
  { value?: any }
>;
export function isDiscreteGameStatePredicate(
  predicate: ExecutableGameStatePredicate
): predicate is DiscreteGameStatePredicate {
  return "value" in predicate;
}

// Predicated objects are a combination of predicates to filter on, and an underlying type
// Range predicates just keep a list of predicate and value tuples
export type RangeGameStatePredicated<V> = {
  kind: "range";
  entries: {
    predicates: RangeGameStatePredicate[];
    values: V[];
  }[];
};

// Discrete predicates create a tree of discrete predicate values to branch
// into
export type DiscreteGameStatePredicated<
  T extends DiscreteGameStatePredicate,
  V
> = {
  kind: "discrete";
  predicate: T["kind"];
  map?: Map<
    T["value"],
    | DiscreteGameStatePredicated<DiscreteGameStatePredicate, V>
    | RangeGameStatePredicated<V>
    | V[]
  >;
  invertedMap?: Map<
    T["value"],
    | DiscreteGameStatePredicated<DiscreteGameStatePredicate, V>
    | RangeGameStatePredicated<V>
    | V[]
  >;
  unpredicated?:
    | DiscreteGameStatePredicated<DiscreteGameStatePredicate, V>
    | RangeGameStatePredicated<V>
    | V[];
};

export type GameStatePredicated<V> =
  // For now, enforce all discrete predicates come before range predicates
  | DiscreteGameStatePredicated<DiscreteGameStatePredicate, V>
  | RangeGameStatePredicated<V>
  | V[];

// And how we sample the predicated objects
export type GameStateContext = Partial<
  {
    [P in DiscreteGameStatePredicate as P["kind"]]: P["value"];
  } & {
    [key in RangeGameStatePredicate["kind"]]: number;
  }
>;
export function sampleGameStatePredicated<V>(
  predicated: GameStatePredicated<V>,
  context?: GameStateContext
): V[] {
  if (Array.isArray(predicated)) {
    return predicated;
  }
  if (predicated.kind === "range") {
    // Go through each entry, and if all predicates match, return accumulated values.
    return flatMap(predicated.entries, (entry) => {
      // Check if predicates match context
      if (
        every(entry.predicates, (predicate) => {
          if (context?.[predicate.kind] === undefined) {
            return true;
          }
          const inRange =
            context[predicate.kind]! >= (predicate.min ?? -Infinity) &&
            context[predicate.kind]! <= (predicate.max ?? Infinity);
          if (predicate.invert) {
            return !inRange;
          }
          return inRange;
        })
      ) {
        return entry.values;
      }
      return [];
    });
  }
  if (predicated.kind === "discrete") {
    // Recurse, selecting on the discrete predicate
    const value = context?.[predicated.predicate];
    if (value === undefined) {
      // No value to discriminate on, so return all values
      const ret = flatMap(
        [
          ...(predicated.map?.values() ?? []),
          ...(predicated.invertedMap?.values() ?? []),
          predicated.unpredicated,
        ],
        (v) => {
          if (v) {
            return sampleGameStatePredicated(v, context);
          }
          return [];
        }
      );
      return ret;
    }

    return [
      ...sampleGameStatePredicated<V>(
        predicated.map?.get(value) ?? [],
        context
      ),
      ...sampleGameStatePredicated<V>(predicated.unpredicated ?? [], context),
      ...flatMap(
        [...(predicated.invertedMap?.keys() ?? [])].filter((k) => k !== value),
        (k) =>
          sampleGameStatePredicated<V>(
            predicated.invertedMap?.get(k) ?? [],
            context
          )
      ),
    ];
  }
  assertNever(predicated);
  return [];
}

export function printGameStatePredicated<V>(
  predicated: GameStatePredicated<V>,
  indent = 0
): string {
  const prefix = "  ".repeat(indent);
  if (Array.isArray(predicated)) {
    return "unpredicated\n" + prefix + JSON.stringify(predicated);
  } else if (predicated.kind === "range") {
    const lines = predicated.entries.map((entry) => {
      return `${entry.predicates
        .map((p) => `${p.kind}: ${p.min ?? "-∞"}-${p.max ?? "∞"}`)
        .join(", ")}: ${JSON.stringify(entry.values)}`;
    });
    return ["range", ...lines.map((line) => prefix + line)].join("\n");
  } else if (predicated.kind === "discrete") {
    const lines = [...(predicated.map?.entries() ?? [])].map(([key, value]) => {
      return `${key}: ${printGameStatePredicated(value, indent + 2)}`;
    });
    lines.push(
      ...[...(predicated.invertedMap?.entries() ?? [])].map(([key, value]) => {
        return `~${key}: ${printGameStatePredicated(value, indent + 2)}`;
      })
    );
    lines.push(
      `all: ${printGameStatePredicated(
        predicated.unpredicated ?? [],
        indent + 2
      )}`
    );

    return [
      `discrete:${predicated.predicate}`,
      ...lines.map((line) => prefix + line),
    ].join("\n");
  }
  return "";
}
