import { ok } from "assert";
import type { Falsey } from "lodash";

export function deepMerge<T extends {}, S extends {}>(target: T, source: S): T {
  for (const key of Object.keys(source)) {
    if (source[key as keyof S] instanceof Object) {
      if (!target[key as keyof T]) {
        (target as any)[key] = {};
      }
      Object.assign(
        source[key as keyof S] as {},
        deepMerge(target[key as keyof T] as {}, source[key as keyof S] as {})
      );
    }
  }

  Object.assign(target || {}, source);
  return target;
}

export function chunk<T>(input: Iterable<T>, size: number) {
  const chunks = [];
  let chunk = [];
  for (const item of input) {
    chunk.push(item);
    if (chunk.length === size) {
      chunks.push(chunk);
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    chunks.push(chunk);
  }
  return chunks;
}

export function flatten<T>(input: Iterable<T[]>) {
  const ret: T[] = [];
  for (const x of input) {
    ret.push(...x);
  }
  return ret;
}

export function findSortedInsertPosition<T>(
  input: Array<T>,
  val: number,
  mapper: (val: T) => number,
  type: "ASC" | "DESC" = "ASC"
) {
  for (let i = 0; i < input.length; i += 1) {
    if (type === "ASC" && mapper(input[i]) > val) {
      return i;
    } else if (type === "DESC" && mapper(input[i]) < val) {
      return i;
    }
  }

  return input.length;
}

export function take<T>(input: Iterable<T>, size: number) {
  const ret = [];
  if (size > 0) {
    for (const item of input) {
      ret.push(item);
      if (ret.length >= size) {
        break;
      }
    }
  }
  return ret;
}

export function takeIf<T>(
  input: Iterable<T>,
  size: number,
  predicate: (value: T) => boolean
) {
  const ret = [];
  if (size > 0) {
    for (const item of input) {
      if (predicate(item)) {
        ret.push(item);
        if (ret.length >= size) {
          break;
        }
      }
    }
  }
  return ret;
}

export function withSwappedLocations<T>(
  arr: Array<T>,
  index1: number,
  index2: number
) {
  const ret = [...arr];
  [ret[index1], ret[index2]] = [ret[index2], ret[index1]];
  return ret;
}

export function combineCountMap<K>(
  base: Map<K, number>,
  newOne: Map<K, number>
) {
  for (const [k, v] of newOne) {
    base.set(k, (base.get(k) ?? 0) + v);
  }
}

export function removeValue<T>(array: T[], value: T) {
  const index = array.indexOf(value);
  if (index === -1) {
    return false;
  }
  array.splice(index, 1);
  return true;
}

export function getOrCreate<Key, Value>(
  map: Map<Key, Value>,
  key: Key,
  factory: () => Value
) {
  if (!map.has(key)) {
    map.set(key, factory());
  }
  return map.get(key)!;
}

export function setMapFrom<Key, Value>(
  target: Map<Key, Value>,
  source: ReadonlyMap<Key, Value>
) {
  target.clear();
  for (const [key, value] of source) {
    target.set(key, value);
  }
}

export function reduceMap<Key, Value, T>(
  initial: T,
  input: ReadonlyMap<Key, Value>,
  fn: (acc: T, value: Value, key: Key) => T
) {
  for (const [key, value] of input) {
    initial = fn(initial, value, key);
  }
  return initial;
}

export function partitionMap<Key, Value>(
  input: ReadonlyMap<Key, Value>,
  predicate: (value: Value, key: Key) => boolean
) {
  const trueies = new Map<Key, Value>();
  const falsies = new Map<Key, Value>();
  for (const [key, value] of input) {
    if (predicate(value, key)) {
      trueies.set(key, value);
    } else {
      falsies.set(key, value);
    }
  }
  return [trueies, falsies];
}

export function filterMap<Key, Value>(
  input: ReadonlyMap<Key, Value>,
  predicate: (value: Value, key: Key) => boolean
) {
  const result = new Map<Key, Value>();
  for (const [key, value] of input) {
    if (predicate(value, key)) {
      result.set(key, value);
    }
  }
  return result;
}

export function filterMapInPlace<Key, Value>(
  map: Map<Key, Value>,
  predicate: (value: Value, key: Key) => boolean
) {
  for (const [key, value] of map) {
    if (!predicate(value, key)) {
      map.delete(key);
    }
  }
}

export function takeFromSet<V>(set: Set<V>, count: number): V[] {
  const ret = [];
  for (const item of set) {
    ret.push(item);
    set.delete(item);
    if (ret.length >= count) {
      break;
    }
  }
  return ret;
}

export function onlyMapValue<Key, Value>(
  input: ReadonlyMap<Key, Value>
): Value {
  ok(input.size === 1);
  return input.values().next().value;
}

export function anyMapValue<Key, Value>(
  input: ReadonlyMap<Key, Value>
): Value | undefined {
  return input.size === 0 ? undefined : input.values().next().value;
}

export function flatMapMap<Key, Value, Result>(
  input: ReadonlyMap<Key, Value>,
  fn: (value: Value, key: Key) => Result[]
): Result[] {
  const result: Result[] = [];
  for (const [key, value] of input) {
    result.push(...fn(value, key));
  }
  return result;
}

export function mapMap<Key, Value, Result>(
  input: ReadonlyMap<Key, Value>,
  fn: (value: Value, key: Key) => Result
): Result[] {
  return Array.from(input, ([k, v]) => fn(v, k));
}

export function mutUpdateMap<Key, Value>(
  input: Map<Key, Value>,
  fn: (value: Value, key: Key) => Value
) {
  for (const [k, v] of input) {
    input.set(k, fn(v, k));
  }
}

// Return true if any entry matches a predicate.
export function someMap<Key, Value>(
  input: ReadonlyMap<Key, Value>,
  predicate: (value: Value, key: Key) => boolean
): boolean {
  for (const [key, value] of input) {
    if (predicate(value, key)) {
      return true;
    }
  }
  return false;
}

export function filterSet<KT>(
  input: ReadonlySet<KT>,
  predicate: (val: KT) => boolean
): KT[] {
  const result: KT[] = [];
  for (const item of input) {
    if (predicate(item)) {
      result.push(item);
    }
  }
  return result;
}

export function mapSet<KT, RT>(
  input: ReadonlySet<KT>,
  fn: (value: KT, idx: number) => RT
): RT[] {
  return Array.from(input, fn);
}

export function maybeFirstSetValue<Key>(
  input?: ReadonlySet<Key>
): Key | undefined {
  return !input || input.size === 0 ? undefined : input.values().next().value;
}

export function firstSetValue<Key>(input: ReadonlySet<Key>): Key | undefined {
  return input.size === 0 ? undefined : input.values().next().value;
}

export function onlySetValue<Key>(input: ReadonlySet<Key>): Key {
  ok(input.size === 1);
  return input.values().next().value;
}

export function isSuperset<T>(set: Set<T>, subset: Set<T>) {
  for (const elem of subset) {
    if (!set.has(elem)) {
      return false;
    }
  }
  return true;
}

// Return any truthy value from a set of promises, ignoring all other rejections.
export async function tryAny<T>(
  ...promises: Array<Promise<T>>
): Promise<T | undefined> {
  const promiseMap = new Map(
    promises.map((promise, index) => [
      index,
      (async (promise, index) => [index, await promise] as [number, T])(
        promise,
        index
      ),
    ])
  );
  while (promiseMap.size > 0) {
    try {
      const [index, result] = await Promise.any(promiseMap.values());
      if (result) {
        return result;
      }
      promiseMap.delete(index);
    } catch (e) {
      // Ignore.
      return;
    }
  }
}

export class DefaultMap<Key, Value> extends Map<Key, Value> {
  constructor(private initFn: (key: Key) => Value) {
    super();
  }

  get(key: Key): Value {
    const got = super.get(key);
    if (got !== undefined) {
      return got;
    }
    const init = this.initFn(key);
    this.set(key, init);
    return init;
  }

  peek(key: Key): Value | undefined {
    return super.get(key);
  }
}

export class MultiMap<Key, Value> {
  readonly underlyingMap = new Map<Key, Value[]>();

  add(key: Key, value: Value) {
    const values = this.underlyingMap.get(key);
    if (values) {
      values.push(value);
    } else {
      this.underlyingMap.set(key, [value]);
    }
  }

  addAll(key: Key, values: IterableIterator<Value> | Array<Value>) {
    const existing = this.underlyingMap.get(key);
    if (existing) {
      for (const v of values) {
        existing.push(v);
      }
    } else {
      this.underlyingMap.set(key, Array.from(values));
    }
  }

  set(key: Key, values: Value[]) {
    this.underlyingMap.set(key, values);
  }

  get(key: Key): Value[] {
    return this.underlyingMap.get(key) || [];
  }

  deleteAll(key: Key) {
    this.underlyingMap.delete(key);
  }

  delete(key: Key, value: Value) {
    const values = this.underlyingMap.get(key);
    if (!values) {
      return;
    }
    const index = values.indexOf(value);
    if (index === -1) {
      return;
    }
    values.splice(index, 1);
    if (values.length === 0) {
      this.underlyingMap.delete(key);
    }
  }

  has(key: Key, value: Value) {
    const values = this.underlyingMap.get(key);
    if (!values) {
      return false;
    }
    return values.indexOf(value) !== -1;
  }

  hasAny(key: Key) {
    return this.underlyingMap.has(key);
  }

  clear() {
    this.underlyingMap.clear();
  }

  keys() {
    return this.underlyingMap.keys();
  }

  [Symbol.iterator]() {
    return this.underlyingMap[Symbol.iterator]();
  }

  map<R>(fn: (entry: [Key, Value[]]) => R): R[] {
    return Array.from(this, fn);
  }
}

export type ReadonlyMultiMap<Key, Value> = {
  get: (key: Key) => ReadonlyArray<Value>;
  has: (key: Key, value: Value) => boolean;
  hasAny: (key: Key) => boolean;
  readonly size: number;
  keys: () => IterableIterator<Key>;
  [Symbol.iterator]: () => IterableIterator<[Key, ReadonlyArray<Value>]>;
  map: <R>(fn: (entry: [Key, ReadonlyArray<Value>]) => R) => R[];
};

export class UniqueMultiMap<Key, Value> {
  readonly underlyingMap = new Map<Key, Set<Value>>();

  add(key: Key, value: Value) {
    const values = this.underlyingMap.get(key);
    if (values) {
      values.add(value);
    } else {
      this.underlyingMap.set(key, new Set([value]));
    }
  }

  addAll(key: Key, values: IterableIterator<Value> | Array<Value>) {
    const existing = this.underlyingMap.get(key);
    if (existing) {
      for (const v of values) {
        existing.add(v);
      }
    } else {
      this.underlyingMap.set(key, new Set(values));
    }
  }

  get(key: Key): ReadonlySet<Value> {
    return this.underlyingMap.get(key) || new Set();
  }

  deleteAll(key: Key) {
    this.underlyingMap.delete(key);
  }

  delete(key: Key, value: Value) {
    const values = this.underlyingMap.get(key);
    if (!values) {
      return;
    }
    values.delete(value);
    if (values.size === 0) {
      this.underlyingMap.delete(key);
    }
  }

  has(key: Key, value: Value) {
    const values = this.underlyingMap.get(key);
    if (!values) {
      return false;
    }
    return values.has(value);
  }

  hasAny(key: Key) {
    return this.underlyingMap.has(key);
  }

  get size() {
    return this.underlyingMap.size;
  }

  clear() {
    this.underlyingMap.clear();
  }

  keys() {
    return this.underlyingMap.keys();
  }

  [Symbol.iterator]() {
    return (this.underlyingMap as Map<Key, ReadonlySet<Value>>)[
      Symbol.iterator
    ]();
  }
}

export class Mapping1N<T> {
  private readonly keyToValue = new UniqueMultiMap<T, T>();
  private readonly valueToKey = new Map<T, T>();

  get keyCount() {
    return this.keyToValue.size;
  }

  get valueCount() {
    return this.valueToKey.size;
  }

  add(key: T, value: T) {
    const existing = this.valueToKey.get(value);
    if (existing !== undefined) {
      this.keyToValue.delete(existing, value);
    } else if (existing === key) {
      return;
    }
    this.keyToValue.add(key, value);
    this.valueToKey.set(value, key);
  }

  remove(keyOrValue: T) {
    // Handle the case where it's a value.
    const existing = this.valueToKey.get(keyOrValue);
    if (existing !== undefined) {
      this.keyToValue.delete(existing, keyOrValue);
      this.valueToKey.delete(keyOrValue);
    }
    // Handle the case where it's a key.
    for (const value of this.keyToValue.get(keyOrValue)) {
      this.valueToKey.delete(value);
    }
    this.keyToValue.deleteAll(keyOrValue);
  }

  getByKey(key: T) {
    return this.keyToValue.get(key);
  }
}

export function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length === 0) {
    yield arr;
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of permutations(rest)) {
      yield [arr[i], ...perm];
    }
  }
}

export function* joinIterables<T>(...inputs: (Iterable<T> | undefined)[]) {
  for (const input of inputs) {
    if (input !== undefined) {
      yield* input;
    }
  }
}

export function* mapIterable<T, R>(
  input: Iterable<T>,
  fn: (value: T, idx: number) => R
) {
  let idx = 0;
  for (const value of input) {
    yield fn(value, idx++);
  }
}

export function* filterIterable<T>(
  input: Iterable<T>,
  predicate: (value: T, idx: number) => boolean
) {
  let idx = 0;
  for (const value of input) {
    if (predicate(value, idx++)) {
      yield value;
    }
  }
}

// Generates a choice array, e.g. n=3, m=2:
//    [0, 0, 0]
//    [0, 0, 1]
//    [0, 1, 0]
//    [0, 1, 1]
//       ...
//    [1, 1, 1]
function* choiceArray(n: number, m: number = 2): Generator<number[]> {
  const arr = new Array<number>(n).fill(0);
  for (let i = 0; i < m ** n; i++) {
    for (let j = 0; j < n; j++) {
      arr[j]++;
      const carry = arr[j] === m;
      arr[j] %= m;
      if (!carry) {
        break;
      }
    }
    yield arr;
  }
}

// For every index, choose an item at that index from one of the given arrays.
// 1. Start with all items taken from the first array.
// 2. End up with all items chosen from the last array.
export function* chooseAllPossibilities<T>(
  ...possibilities: T[][]
): Generator<T[]> {
  const n = possibilities[0].length;
  for (const possiblity of possibilities) {
    ok(possiblity.length === n);
  }
  const m = possibilities.length;
  for (const choice of choiceArray(n, m)) {
    yield choice.map((pick, idx) => possibilities[pick][idx]);
  }
}

// Computes a \ b
export function setDiff<T>(a: Set<T>, b: Set<T>) {
  return [...a].filter((x) => !b.has(x));
}

// Map any iterable but only keep truthy values
export function compactMap<T, R>(
  it: Iterable<T> | undefined,
  fn: (t: T, index: number) => R | Falsey
): R[] {
  const results: R[] = [];
  if (it) {
    let index = 0;
    for (const value of it) {
      const result = fn(value, index++);
      if (result) {
        results.push(result);
      }
    }
  }
  return results;
}
