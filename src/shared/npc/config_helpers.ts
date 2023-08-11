import * as z from "zod";

export function getDuplicates<T>(array: T[]): T[] {
  const valueSet = new Set<T>();
  const duplicates = new Set<T>();
  for (const x of array) {
    if (valueSet.has(x)) {
      duplicates.add(x);
    } else {
      valueSet.add(x);
    }
  }
  return [...duplicates];
}

export function ensureUniqueValues<T extends z.ZodTypeAny>(a: z.ZodArray<T>) {
  return a.superRefine((array, ctx) => {
    const duplicates = getDuplicates(array);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected a set of unique values, found duplicates of [${duplicates}]`,
      });
    }
  });
}
