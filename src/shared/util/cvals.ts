import { Averager } from "@/shared/util/counters";
import type { JSONable, RecursiveJSONable } from "@/shared/util/type_helpers";
import { last } from "lodash";

export type CvalPathComponent = string;
export type CvalPath = readonly CvalPathComponent[];

type CvalNode = CvalDatabase | CvalHook<JSONable>;

// The Cval system avoid multiplicative dependencies between producers and
// consumers, where the producers are debug internal values in the
// codebase that we'd like to have observability on, and the consumers are
// the systems that want to observe them (e.g. on-screen heads up displays,
// or sampling the values to observe client metrics on the server).
//
// CvalHook1 \              / Consumer1
// CvalHook2 - CvalDatabase - Consumer2
// CvalHook3 /              \ Consumer3
//

// A CvalDatabase is essentially a dictionary of other CvalDatabases, or
// CvalHooks. CvalHooks can be registered from many places in the codebase to
// a CvalDatabase, and then CvalDatabase clients (like a HUD or a client info
// sampler) can query over registered values and consume them as desired.
// Ultimately the consumed results lose their static typing in this process,
// and are only dynamically typed (essentially JSON) to the consumers. Dynamic
// typing in this case is nice because a common use case for CvalDatabase
// consumers, e.g. an onscreen HUD, don't care about static types because they
// can happily render any data as a JSON tree and don't want dependencies on
// all of the Cval definition sites and the domain-specific types used.
export interface CvalDatabase {
  kind: "CvalDatabase";

  label: CvalPathComponent;
  children: Map<CvalPathComponent, CvalNode>;
}

// A CvalHook is what connects the centralized CvalDatabase to various points in the
// code that we might be interested in. When a CvalDatabase client queries the database
// for cvals, it ultimately calls out to all the hooks that are registered with it asking them
// to update their data.
export interface CvalHook<T extends JSONable, U extends JSONable = T> {
  kind: "CvalHook";

  readonly label: CvalPathComponent;
  readonly help: string;
  readonly collect: () => T;
  // Can be called if an easier-to-read view of structured data is available.
  readonly toHumanReadable?: (x: T) => JSONable;
  // TODO(top): Introduce
  //              readonly asHtml?: (x: T) => string;
  //            And make use of it in a more customizable HUD display than we
  //            have today.
  makeAccumulator?: () => Accumulator<T, U>;
}

export function remove(cvalDatabase: CvalDatabase, path: CvalPath) {
  if (path.length === 0) {
    throw new Error("path cannot be empty!");
  }

  if (path.length === 1) {
    cvalDatabase.children.delete(path[0]);
    return;
  }
  const existingItem = cvalDatabase.children.get(path[0]);
  if (!existingItem) {
    return;
  }
  if (existingItem.kind !== "CvalDatabase") {
    throw new Error(
      "Expected an internal node but found an existing leaf node."
    );
  }
  remove(existingItem, path.slice(1));
}

function add(cvalDatabase: CvalDatabase, path: CvalPath, node: CvalNode) {
  if (path.length === 0) {
    throw new Error("path cannot be empty!");
  }

  let existingItem = cvalDatabase.children.get(path[0]);

  if (path.length === 1) {
    // An item with the same path already exists.
    // Oof, this is a tough one.
    //   1. If we throw an error, then effectively there can only ever be one
    //      CvalHook instance at any given path, forever (we don't know when gc
    //      will happen).
    //   2. If we overwrite, then users won't get errors when they accidentally
    //      assign two values to the same path. One will get overwritten by the
    //      other and this may lead to confusion.
    //   3. If we make a list of Cvals with the same path, then the type can
    //      change at runtime from type X to X[], confusing consumers.
    // Because a major use case (e.g. for unit testing) is objects being created
    // and turned into garbage multiple times in sequence, and 2 supports that use
    // case, we go with 2 and `set()` undonctionally here.
    cvalDatabase.children.set(path[0], node);
    return;
  }

  // As a convenience, similar to `mkdir -p`, add internal CvalDatabase nodes
  // that don't already exist leading up to the specified path.
  if (!existingItem) {
    existingItem = makeCvalDatabase(path[0]);
    cvalDatabase.children.set(path[0], existingItem);
  }
  if (existingItem.kind !== "CvalDatabase") {
    throw new Error(
      "Expected an internal node but found an existing leaf node."
    );
  }
  add(existingItem, path.slice(1), node);
}

export function get(
  cvalDatabase: CvalDatabase,
  path: CvalPath
): CvalNode | undefined {
  if (path.length == 0) {
    throw new Error("path cannot be empty!");
  }

  const existingItem = cvalDatabase.children.get(path[0]);
  if (!existingItem) {
    return undefined;
  }

  if (path.length == 1) {
    return existingItem;
  }

  if (existingItem?.kind === "CvalHook") {
    // Found a hook before we got to the leaf of our path!
    return undefined;
  }

  return get(existingItem, path.slice(1));
}

export function getCvalHook(
  cvalDatabase: CvalDatabase,
  path: CvalPath
): CvalHook<JSONable> | undefined {
  const hookOrDatabase = get(cvalDatabase, path);
  return hookOrDatabase?.kind === "CvalHook" ? hookOrDatabase : undefined;
}

// Keeps track of accumulated state across multiple collections. Cvals are
// free to describe how they should be accumulated, for example to smooth out
// values over time, or so that rates can be extracted from counters by
// multiple collection sites collecting at different frequencies.
export class AccumulatorContext {
  private accumulators: Map<
    CvalHook<JSONable>,
    Accumulator<JSONable, JSONable>
  > = new Map();

  constructor() {}

  accumulate(cval: CvalHook<JSONable>, timeInSeconds: number) {
    const v = cval.collect();
    if (!cval.makeAccumulator) {
      return v;
    }

    let accumulator = this.accumulators.get(cval);
    if (!accumulator) {
      accumulator = cval.makeAccumulator();
      this.accumulators.set(cval, accumulator);
    }
    return accumulator(v, timeInSeconds);
  }
}

export function collectAll(
  cvalDatabase: CvalDatabase,
  mapCvalHooks = (x: CvalHook<JSONable>) => x.collect()
): Record<string, JSONable> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Object.fromEntries(
    Array.from(cvalDatabase.children)
      .map(([k, v]) => {
        if (v.kind == "CvalDatabase") {
          return [k, collectAll(v, mapCvalHooks)];
        } else {
          return [k, mapCvalHooks(v)];
        }
      })
      .sort()
  );
}

export function collectAllWithAccumulation(
  cvalDatabase: CvalDatabase,
  accumulatorContext: AccumulatorContext,
  timeInSeconds: number
) {
  return collectAll(cvalDatabase, (x) => {
    return accumulatorContext.accumulate(x, timeInSeconds);
  });
}

export function collectAllAsHumanReadable(
  cvalDatabase: CvalDatabase,
  accumulatorContext: AccumulatorContext,
  timeInSeconds: number
) {
  return collectAll(cvalDatabase, (x) => {
    const v = accumulatorContext.accumulate(x, timeInSeconds);
    return x.toHumanReadable ? x.toHumanReadable(v) : v;
  });
}

// Using globalThis as opposed to leaving it as a module property so that it
// can easily be accessed through a console in case a heads up display is not
// available...
declare global {
  var defaultCvalDatabase: CvalDatabase; // eslint-disable-line no-var
}
globalThis.defaultCvalDatabase = makeCvalDatabase("root");

// ... but for the sake of tracking dependencies, always access it through
// this defaultCvalDatabase() function in code.
export function defaultCvalDatabase(): CvalDatabase {
  return globalThis.defaultCvalDatabase;
}

export function makeCvalDatabase(label: string): CvalDatabase {
  return { kind: "CvalDatabase", label: label, children: new Map() };
}

export function removeCvalPath({
  path,
  cvalDatabase = undefined,
}: {
  path: CvalPath;
  cvalDatabase?: CvalDatabase;
}) {
  remove(cvalDatabase ?? defaultCvalDatabase(), path);
}

export function makeCvalHook<T extends JSONable, U extends JSONable = T>({
  path,
  help,
  collect,
  toHumanReadable = undefined,
  cvalDatabase = undefined,
  makeAccumulator = undefined,
}: {
  path: CvalPath;
  help: string;
  collect: CvalHook<T>["collect"];
  toHumanReadable?: (x: U) => JSONable;
  cvalDatabase?: CvalDatabase;
  makeAccumulator?: () => Accumulator<T, U>;
}) {
  add(cvalDatabase || defaultCvalDatabase(), path, {
    kind: "CvalHook",
    label: last(path)!,
    help,
    collect,
    toHumanReadable,
    makeAccumulator,
  } as CvalHook<JSONable>);
}

// Helper to make it so that we don't hyper-narrow the Cval type based on the
// specified initial value.
type WidenedPrimitive<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T;

export type Accumulator<T, U> = (x: T, timeInSeconds: number) => U;

export function makeSmoothingAccumulator(initialValue: number) {
  const smoothed = new Averager(initialValue, 0.95);
  return {
    accumulate: (x: number, _timeInSeconds: number) => smoothed.push(x),
    get: () => smoothed.get(),
  };
}

// A common use case is to create a debug value that is wrapped by a CvalHook, so the
// standard Cval is a class that packages together a value and a CvalHook on that value.
export class Cval<T extends RecursiveJSONable<T>> {
  public value: WidenedPrimitive<T>;

  constructor({
    path,
    help,
    initialValue,
    toHumanReadable = undefined,
    cvalDatabase = undefined,
  }: {
    path: CvalPath;
    help: string;
    initialValue: WidenedPrimitive<T>;
    toHumanReadable?: (x: WidenedPrimitive<T>) => JSONable;
    cvalDatabase?: CvalDatabase;
  }) {
    this.value = initialValue;
    makeCvalHook({
      path: path,
      help: help,
      collect: () => this.value,
      toHumanReadable: toHumanReadable,
      cvalDatabase: cvalDatabase,
    });
  }
}

export function humanReadableDurationMs(ms: number) {
  if (typeof ms !== "number") {
    return ms;
  }
  let out = "";
  if (ms > 1000 * 60 * 60) {
    out += `${Math.floor(ms / (1000 * 60 * 60))}h`;
    ms = ms % (1000 * 60 * 60);
  }
  if (ms > 1000 * 60) {
    out += `${Math.floor(ms / (1000 * 60))}m`;
    ms = ms % (1000 * 60);
  }
  out += `${(ms / 1000).toFixed(out ? 0 : 3)}s`;
  return out;
}
