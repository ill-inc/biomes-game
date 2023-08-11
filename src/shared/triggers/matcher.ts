import { attribs } from "@/shared/bikkie/schema/attributes";
import { anItem, isItem, resolveItemAttribute } from "@/shared/game/item";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Matcher } from "@/shared/triggers/matcher_schema";
import { DefaultMap, someMap } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import { without } from "lodash";

// Returns true if matcher matches precisely one of the values.
function distinctArrayMatches(values: any[], matchers: Matcher[]) {
  return internalDistinctArrayMatches(
    values,
    matchers,
    new DefaultMap(
      (matcher) => new DefaultMap((i) => matches(matcher, values[i]))
    ),
    []
  );
}

function internalDistinctArrayMatches(
  values: any[],
  matchers: Matcher[],
  memoMatch: DefaultMap<Matcher, DefaultMap<number, boolean>>,
  usedIndices: number[]
): boolean {
  if (matchers.length === 0) {
    return true;
  }

  if (values.length < matchers.length) {
    return false;
  }

  for (let i = 0; i < values.length; i += 1) {
    if (usedIndices.includes(i)) {
      continue;
    }

    for (const matcher of matchers) {
      const doesMatch = memoMatch.get(matcher).get(i);
      if (
        doesMatch &&
        internalDistinctArrayMatches(
          values,
          without(matchers, matcher),
          memoMatch,
          [...usedIndices, i]
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function matches(matcher: Matcher, value: unknown): boolean {
  try {
    switch (matcher.kind) {
      case "object":
        return (
          typeof value === "object" &&
          value !== null &&
          (!matcher.restrictToUnionValue ||
            (value as Record<string, unknown>).kind ===
              matcher.restrictToUnionValue) &&
          matcher.fields.every(([key, matcher]) => {
            if (!(key in value)) {
              return false;
            }
            return matches(matcher, (value as Record<string, unknown>)[key]);
          })
        );
      case "distinctArrayMatches": {
        if (!Array.isArray(value)) {
          return false;
        }

        return distinctArrayMatches(value, matcher.fields);
      }
      case "anyItemWith":
        const attribute = attribs.byId.get(matcher.attributeId);
        if (!attribute) {
          return false;
        }
        switch (typeof value) {
          case "string":
            // Encoded item bag.
            const bag = stringToItemBag(value);
            return someMap(
              bag,
              ({ item }) => !!resolveItemAttribute(item, attribute)
            );
          case "number":
            // Raw item.
            return !!resolveItemAttribute(anItem(value as BiomesId), attribute);
          case "object":
            return isItem(value) && !!resolveItemAttribute(value, attribute);
        }
        return false;

      case "anyItemEqual":
        switch (typeof value) {
          case "string":
            // Encoded item bag.
            const bag = stringToItemBag(value);
            return someMap(bag, ({ item }) => item.id === matcher.bikkieId);
          case "number":
            // Raw item.
            return anItem(value as BiomesId).id === matcher.bikkieId;
          case "object":
            return isItem(value) && value.id === matcher.bikkieId;
        }
        return false;

      case "value":
        return value === matcher.value;

      case "numberRange":
        if (typeof value !== "number") {
          return false;
        }

        if (
          (matcher.min === undefined || value >= matcher.min) &&
          (matcher.max === undefined || value <= matcher.max)
        ) {
          return true;
        }

        return false;

      default:
        assertNever(matcher);
    }
  } catch (error) {
    // Ignore matcher exceptions, we'll just return false.
    log.debug("Matcher failed with exception", { kind: matcher.kind, error });
  }
  return false;
}
