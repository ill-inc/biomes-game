import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";
import { FieldDeleteMarker } from "@/server/shared/storage/biomes";

import type { JSONObject } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { isArray, isEqual, isFunction, isNil, isPlainObject } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

// We don't permit full path evaluation, only a single field at a time.
export function checkValidPath(path: string) {
  if (path.indexOf(".") !== -1) {
    throw new Error("path must be a single field reference");
  }
}

// Create a filter function for a given document.
function createFilterIndexKey(
  field: string,
  opStr: BiomesStorage.WhereFilterOp
): string {
  switch (opStr) {
    case "<":
      return `${field}<`;
    case "<=":
      return `${field}<`;
    case "==":
      return `${field}=`;
    case "!=":
      return `${field}=`;
    case ">=":
      return `${field}>`;
    case ">":
      return `${field}>`;
    case "in":
      return `${field}in`;
    default:
      throw new Error(`Unsupported opStr: ${opStr}`);
  }
}

function extractField(value: any, fields: string[]): any {
  for (const field of fields) {
    if (value === undefined) {
      break;
    }
    value = value[field];
  }
  return value;
}

function createFilterFunction(
  field: string,
  opStr: BiomesStorage.WhereFilterOp,
  value: any
): (snapshot: { data: () => any }) => boolean {
  const path = field.split(".");
  switch (opStr) {
    case "<":
      return (snapshot) => extractField(snapshot.data(), path) < value;
    case "<=":
      return (snapshot) => extractField(snapshot.data(), path) <= value;
    case "==":
      return (snapshot) => isEqual(extractField(snapshot.data(), path), value);
    case "!=":
      return (snapshot) => !isEqual(extractField(snapshot.data(), path), value);
    case ">=":
      return (snapshot) => extractField(snapshot.data(), path) >= value;
    case ">":
      return (snapshot) => extractField(snapshot.data(), path) > value;
    case "in":
      ok(isArray(value), "Expected array for value and 'in' clause");
      return (snapshot) => value.includes(extractField(snapshot.data(), path));
    default:
      throw new Error(`Unsupported opStr: ${opStr}`);
  }
}

export interface Filter {
  key: string;
  fn: (snapshot: { data: () => any }) => boolean;
}

export function createFilter(
  field: string,
  opStr: BiomesStorage.WhereFilterOp,
  value: any
): Filter {
  return {
    key: createFilterIndexKey(field, opStr),
    fn: createFilterFunction(field, opStr, value),
  };
}

// Simple in-memory implementation of the document snapshot interface.
export class SimpleDocumentSnapshot<
  T extends JSONObject = BiomesStorage.DocumentData
> implements BiomesStorage.DocumentSnapshot<T>
{
  readonly ref: BiomesStorage.DocumentReference<T>;
  private readonly _data?: T;

  constructor(ref: BiomesStorage.DocumentReference<T>, data: T | undefined) {
    this.ref = ref;
    this._data = data;
  }

  get id() {
    return this.ref.id;
  }

  get exists() {
    return this._data !== undefined;
  }

  data(): T | undefined {
    return this._data;
  }
}

// A snapshot of a document resulting from a query, where data is always available.
export class SimpleQueryDocumentSnapshot<
  T extends JSONObject = BiomesStorage.DocumentData
> implements BiomesStorage.QueryDocumentSnapshot<T>
{
  readonly ref: BiomesStorage.DocumentReference<T>;
  readonly exists: boolean = true;
  private readonly _data: T;

  constructor(ref: BiomesStorage.DocumentReference<T>, data: T) {
    this.ref = ref;
    this._data = data;
  }

  get id() {
    return this.ref.id;
  }

  data(): T {
    return this._data;
  }
}

export class SimpleQuerySnapshot<
  T extends JSONObject = BiomesStorage.DocumentData
> implements BiomesStorage.QuerySnapshot<T>
{
  constructor(readonly docs: Array<BiomesStorage.QueryDocumentSnapshot<T>>) {}

  get empty() {
    return this.docs.length === 0;
  }
}

// Document snapshot with an alternative reference.
export class RedirectedDocumentSnapshot<T = BiomesStorage.DocumentData>
  implements BiomesStorage.DocumentSnapshot<T>
{
  constructor(
    public readonly ref: BiomesStorage.DocumentReference<T>,
    public readonly backing: BiomesStorage.DocumentSnapshot<T>
  ) {}

  get exists(): boolean {
    return this.backing.exists;
  }

  get id(): StoragePath {
    return this.backing.id;
  }

  data(): T | undefined {
    return this.backing.data();
  }
}

export class RedirectedQueryDocumentSnapshot<T = BiomesStorage.DocumentData>
  implements BiomesStorage.QueryDocumentSnapshot<T>
{
  constructor(
    public readonly ref: BiomesStorage.DocumentReference<T>,
    public readonly backing: BiomesStorage.QueryDocumentSnapshot<T>
  ) {}

  get exists(): boolean {
    return this.backing.exists;
  }

  get id(): StoragePath {
    return this.backing.id;
  }

  data(): T {
    return this.backing.data();
  }
}

export function removeUndefinedAndDeletionMarkers<C>(obj: C): C {
  const newObj: any = {};
  for (const k in obj) {
    const v = obj[k];
    if ((v as unknown) === FieldDeleteMarker) {
      continue;
    } else if (typeof v == "object" && !Array.isArray(v) && v !== null) {
      newObj[k] = removeUndefinedAndDeletionMarkers(v);
    } else if (!isNil(v)) {
      newObj[k] = v;
    }
  }
  return newObj as C;
}

export function replaceFieldDeleteMarkers<C>(obj: C): C {
  const newObj: any = {};
  for (const k in obj) {
    const v = obj[k];
    if ((v as unknown) === FieldDeleteMarker) {
      newObj[k] = undefined;
    } else if (typeof v == "object" && !Array.isArray(v) && v !== null) {
      newObj[k] = replaceFieldDeleteMarkers(v);
    } else if (!isNil(v)) {
      newObj[k] = v;
    }
  }
  return newObj as C;
}

export function checkCanBeStored<C>(data: C) {
  if (Array.isArray(data)) {
    throw new Error("Cannot store arrays, place as an object field instead.");
  }
  if (!isPlainObject(data)) {
    throw new Error("Cannot store non-object.");
  }
  if (isFunction(data)) {
    throw new Error("Cannot store functions.");
  }
  for (const key in data) {
    const value = data[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        ok(!Array.isArray(item), "Cannot store nested arrays");
      }
    }
  }
}

export const zOrdering = z.object({
  field: z.string(),
  direction: z.string() as ZodType<BiomesStorage.OrderByDirection>,
}) as ZodType<Ordering<any>>;

export interface Ordering<T> {
  readonly field: keyof T & string;
  readonly direction: BiomesStorage.OrderByDirection;
}

function lookupField(obj: any, field: string) {
  for (const part of field.split(".")) {
    obj = obj[part];
  }
  return obj;
}

export function sortByOrdering<T>(
  data: BiomesStorage.QueryDocumentSnapshot<T>[],
  ordering: Ordering<T>
): BiomesStorage.QueryDocumentSnapshot<T>[] {
  return data
    .filter((item) => lookupField(item.data(), ordering.field) !== undefined)
    .sort((a, b) => {
      const aVal = lookupField(a.data(), ordering.field);
      const bVal = lookupField(b.data(), ordering.field);
      if (ordering.direction === "desc") {
        return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });
}

const SUPPORTED_COMPOUND_FILTERS = new Set<string>([
  "userId>:createMs<",
  "creatorId>:createMs<",
  "processorExpiry<:finished=",
]);

// Check that a compound filter has a supported index, is a warning
// to ensure people update firestore.
export function validateCompoundFilter(filters: Filter[]) {
  const hasNonEqualityFilter = filters.some(({ key }) => !key.endsWith("="));
  if (!hasNonEqualityFilter) {
    // Pure compound combinations of non-equality are supported by the
    // firestore single-index filters.
    return;
  }

  const allInequalities = filters.filter(
    ({ key }) => key.includes(">") || key.includes("<")
  );

  if (allInequalities.length > 1) {
    throw new Error(
      `Cannot have inequality filters on multiple properties: [${allInequalities
        .map((e) => e.key)
        .join(", ")}]`
    );
  }

  const compoundKey = filters.map((x) => x.key).join(":");
  if (!SUPPORTED_COMPOUND_FILTERS.has(compoundKey)) {
    throw new Error(
      `Unsupported compound filter "${compoundKey}" please add to ` +
        "SUPPORTED_COMPOUND_FILTERS and when deployed you need to ensure " +
        "you create a Firestore index!"
    );
  }
}
