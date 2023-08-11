import type { Id } from "@/shared/bikkie/util";
import type { AsyncDefault } from "@/shared/zfs/async_default";
import { withAsyncDefault } from "@/shared/zfs/async_default";
import { ok } from "assert";
import { isInteger } from "lodash";
import type { ZodType, ZodTypeAny, z } from "zod";

const PROHIBITED_ATTRIBUTE_NAMES = [
  "attribute",
  "byName",
  "byId",
  "id",
  "name",
  "zod",
  "payload",
];

export function makeAttributeType<T extends ZodType<any>>({
  zod,
  defaultValue,
}: {
  zod: T;
  defaultValue: AsyncDefault<z.infer<T>>;
}): T {
  return withAsyncDefault(zod, defaultValue);
}

// Represents a single named attribute in the Bikkie space.
export interface BikkieAttribute<
  TId extends number,
  TName extends string,
  TType extends ZodType<any>
> {
  readonly id: TId;
  readonly name: TName;
  readonly niceName?: string;
  readonly help?: string;
  readonly description?: string;
  readonly type: () => TType;
  readonly fallbackValue?: () => z.infer<TType>;
  readonly defaultToInferenceRule?: string;
}

export type InferBikkieAttribute<T> = T extends BikkieAttribute<
  any,
  any,
  infer Z
>
  ? z.infer<Z>
  : never;

export type AnyBikkieAttribute = BikkieAttribute<number, string, ZodType<any>>;

export type AnyBikkieAttributeOfType<T extends ZodTypeAny> = BikkieAttribute<
  number,
  string,
  T
>;

export type RawBikkieAttributes = Record<
  number,
  Omit<AnyBikkieAttribute, "id">
>;

export type BakedBikkieAttributes<T extends RawBikkieAttributes> = {
  [K in keyof T as T[K] extends Omit<AnyBikkieAttribute, "id">
    ? T[K]["name"]
    : never]: Id<T[K] & { id: K }>;
} & {
  all: AnyBikkieAttribute[];
  byId: Map<number, AnyBikkieAttribute>;
  byName: Map<string, AnyBikkieAttribute>;
};

// Helper transforms an ID-centric map into an attribute definition, ensuring
// any constraints are met.
export function bakeAttributes<T extends RawBikkieAttributes>(
  attributes: T
): BakedBikkieAttributes<T> {
  const usedNames = new Set<string>(PROHIBITED_ATTRIBUTE_NAMES);
  const space: any = {
    all: [],
    byId: new Map(),
    byName: new Map(),
  };
  for (const rawId in attributes) {
    const id = Number(rawId);
    ok(id > 0, `Attribute IDs must be positive: ${id}`);
    ok(isInteger(id), `Attribute IDs must be integral: ${id}`);
    const attribute = attributes[id];
    ok(
      !usedNames.has(attribute.name),
      `Duplicate attribute name: ${attribute.name}`
    );
    usedNames.add(attribute.name);
    const baked = {
      ...attribute,
      id,
    };
    space[baked.name] = baked;
    space.all.push(baked);
    space.byId.set(id, baked);
    space.byName.set(baked.name, baked);
  }
  return space;
}

export type AnyBakedBikkieAttributes = BakedBikkieAttributes<any>;

export type BikkieAttributes = {
  [K in string]: BikkieAttribute<number, K, ZodType<any>>;
};
