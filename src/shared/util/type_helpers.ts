import { memoize } from "lodash";
import { z } from "zod";

export type JSONable =
  | string
  | number
  | boolean
  | null
  | JSONable[]
  | { [key: string]: JSONable };

export type JSONObject = { [key: string]: JSONable };

export const zJSONLiteral = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export const zJSONable: z.ZodType<JSONable> = z.lazy(
  memoize(() =>
    z.union([zJSONLiteral, z.array(zJSONable), z.record(zJSONable)])
  )
);
export const zJSONObject = z.record(zJSONable);

export type RecursiveJSONable<T, D extends number = 10> = [D] extends [never]
  ? never
  :
      | JSONable
      | { [K in keyof T]: RecursiveJSONable<T[K], Prev[D]> }
      | {
          [K in keyof T]: {
            [K2 in keyof K]: RecursiveJSONable<K[K2], Prev[D]>;
          };
        };

export declare function AssertJSONable<T extends RecursiveJSONable<T>>(
  t?: T
): any;

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${"" extends P ? "" : "."}${P}`
    : never
  : never;

type Prev = [
  never,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  ...0[]
];

export type ObjectPaths<T, D extends number = 10> = [D] extends [never]
  ? never
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | Join<K, ObjectPaths<T[K], Prev[D]>>
        : never;
    }[keyof T]
  : "";

export type ObjectLeavesOfType<ValidType, T, D extends number = 10> = [
  D
] extends [never]
  ? never
  : T extends ValidType
  ? ""
  : T extends any[]
  ? never // eslint-disable-next-line @typescript-eslint/ban-types
  : T extends object
  ? {
      [K in keyof T]-?: Join<K, ObjectLeavesOfType<ValidType, T[K], Prev[D]>>;
    }[keyof T]
  : never;

export type ObjectLeaves<T, D extends number = 10> = [D] extends [never]
  ? never
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object
  ? { [K in keyof T]-?: Join<K, ObjectLeaves<T[K], Prev[D]>> }[keyof T]
  : "";

// Enforces a literal has specific value types
// Requires a curryied call -- e.g.
//    interface Value { test: string }
//    const vals = valueLiteral<Value>()({abc: {test: 'test'}})
export const valueLiteral =
  <V>() =>
  <T extends Record<string, V>>(t: T) =>
    t;

export type OptionalProps<T, K extends keyof T> = Pick<Partial<T>, K> &
  Omit<T, K>;

export function assertNever<T extends never>(param: T): never {
  const _exhaustiveCheck: never = param;
  throw new Error(`Unhandled case: ${param}`);
}

export function passNever<T extends never>(param: T) {
  const _exhaustiveCheck: never = param;
}

export type Optional<T> = T | undefined;

export type TupleOf<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

// TypeScript doesn't know that a parent object's field is no longer
// optional after comparing it specifically against undefined or by using
// "in", so we use this workaround from https://github.com/microsoft/TypeScript/issues/42384#issuecomment-1083119502
// instead.
export function hasProperty<
  T extends { [property in Property]?: T[property] },
  Property extends keyof T & string
>(
  obj: T,
  property: Property
): obj is T & { [property in Property]: NonNullable<T[property]> } {
  return !!obj[property];
}

export type WithId<T, IdT> = T & { id: IdT };

export type DeepReadonly<T> = T extends number
  ? T
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };

export function literalUnion<T extends any[]>(arr: readonly [...T]) {
  return arr as T[number];
}

export function assertUnionMatch<
  Union1 extends { kind: string },
  Union2 extends { kind: string }
>(
  union1: Union1,
  union2: Union2
): asserts union2 is Extract<Union2, { kind: Union1["kind"] }> {
  if (union1.kind !== union2.kind) {
    throw new TypeError(
      `Expected union1 and union2 to match in ${union1.kind} but found ${union2.kind}`
    );
  }
}

export type UnionValue<
  U extends { kind: string },
  K extends U["kind"]
> = Extract<U, { kind: K }>;

export type ObjectSubset<O, T extends keyof O> = Pick<O, T>;
export type ObjectSubsetKeysFor<O, T> = T extends (
  deps: infer U,
  ...args: any[]
) => unknown
  ? U extends Partial<O>
    ? keyof U
    : never
  : never;

export type ObjectSubsetFor<O, T> = ObjectSubset<O, ObjectSubsetKeysFor<O, T>>;

export type Extends<T, U extends T> = U;
