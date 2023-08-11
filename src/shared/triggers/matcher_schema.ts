import { zBiomesId } from "@/shared/ids";
import { memoize } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

export const zAnyItemWithMatcher = z.object({
  kind: z.literal("anyItemWith"),
  attributeId: z.number(),
});

export type AnyItemWithMatcher = z.infer<typeof zAnyItemWithMatcher>;

export const zAnyItemEqualMatcher = z.object({
  kind: z.literal("anyItemEqual"),
  bikkieId: zBiomesId,
});

export type AnyItemEqualMatcher = z.infer<typeof zAnyItemEqualMatcher>;

export const zValueMatcher = z.object({
  kind: z.literal("value"),
  value: z.union([z.string(), z.number(), z.boolean(), zBiomesId]),
});
export type ValueMatcher = z.infer<typeof zValueMatcher>;

export const zNumberRangeMatcher = z.object({
  kind: z.literal("numberRange"),
  min: z.number().optional(),
  max: z.number().optional(),
});
export type NumberRangeMatcher = z.infer<typeof zNumberRangeMatcher>;

export type MatcherParent = ObjectMatcher | DistinctArrayMatches;
export type MatcherLeaf =
  | AnyItemWithMatcher
  | AnyItemEqualMatcher
  | ValueMatcher
  | NumberRangeMatcher;
export type Matcher = MatcherParent | MatcherLeaf;

export const zMatcher = z.lazy(
  memoize(() =>
    z.discriminatedUnion("kind", [
      zAnyItemWithMatcher,
      zAnyItemEqualMatcher,
      zValueMatcher,
      zNumberRangeMatcher,

      zObjectMatcher,
      zDistinctArrayMatchesMatcher,
    ])
  )
) as ZodType<Matcher>;

export const zObjectMatcher = z.object({
  kind: z.literal("object"),
  restrictToUnionValue: z.string().optional(),
  fields: z.tuple([z.string(), zMatcher]).array(),
});

export type ObjectMatcher = {
  kind: "object";
  restrictToUnionValue?: string;
  fields: [string, Matcher][];
};

export const zDistinctArrayMatchesMatcher = z.object({
  kind: z.literal("distinctArrayMatches"),
  fields: zMatcher.array(),
});

export type DistinctArrayMatches = {
  kind: "distinctArrayMatches";
  fields: Matcher[];
};
