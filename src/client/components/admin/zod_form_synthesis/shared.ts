import { ShadowMap } from "@/shared/util/shadow_map";
import type * as z from "zod";

export type CreateZfsAnyFn = <
  S extends z.ZodTypeAny,
  V extends z.infer<S>
>(input: {
  schema: S;
  value: V;
  onChangeRequest: (newValue: V) => void;
  schemaLenses?: LensMap;
}) => JSX.Element;

type LensFunction<S extends z.ZodTypeAny = z.ZodTypeAny> = (
  schema: S,
  value: z.infer<S>,
  onChangeRequest: (newValue: z.infer<S>) => void
) => JSX.Element;

type LensEntry<S extends z.ZodTypeAny = z.ZodTypeAny> = [
  S,
  LensFunction<S>,
  undefined | ((s: S) => boolean)
];

export function makeLensMapEntry<S extends z.ZodTypeAny>(
  schema: S,
  lens: LensFunction<S>,
  isApplicable?: (s: S) => boolean
): LensEntry<S> {
  return [schema, lens, isApplicable];
}

export class LensMap {
  private readonly cached = new ShadowMap<z.ZodTypeAny, LensEntry>();

  constructor(private readonly lenses: LensEntry[]) {}

  map<S extends z.ZodTypeAny>(
    schema: S,
    value: z.infer<S>,
    onChangeRequest: (newValue: z.infer<S>) => void
  ) {
    const [match, ok] = this.cached.get(schema);
    if (ok) {
      if (match) {
        return match[1](schema, value, onChangeRequest);
      }
      return;
    }
    for (const entry of this.lenses) {
      const [lensSchema, lensFn, lensIsApplicable] = entry;
      if (lensSchema === schema || lensIsApplicable?.(schema)) {
        this.cached.set(schema, entry);
        return lensFn(schema, value, onChangeRequest);
      }
    }
    this.cached.set(schema, undefined);
  }
}

export function makeLensMap<T extends LensEntry<any>[]>(...entries: T) {
  return new LensMap(entries);
}
