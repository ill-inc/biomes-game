import { isDisposable } from "@/shared/disposable";
import { log } from "@/shared/logging";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { AcceptableAsPathKey } from "@/shared/resources/path_map";
import { mapSet } from "@/shared/util/collections";
import { Cval, makeCvalHook } from "@/shared/util/cvals";
import { clearObjectProperties, downloadTextFile } from "@/shared/util/helpers";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { sortBy } from "lodash";
import { types } from "util";

const RESOURCE_PATH = /^(\/[A-Za-z0-9+/=_-]+)+$/;

type Arg = string | number | AcceptableAsPathKey;
type GenFn<T> = (deps: ResourceDeps, ...args: Arg[]) => T;
type DepFn = (path: string, args: Arg[]) => Node<unknown>;
type Resolve<T> = T extends PromiseLike<infer U> ? U : T;

const undisposedValues = new Cval({
  path: ["resources", "values"],
  help: "The total number of undisposed (e.g. active) values.",
  initialValue: 0,
});

// Define this globally so that it doesn't unexpectedly retain any context.
function doNothing() {}

// Value encapsulate a resource with reference counting. The reference counting
// mechanism allows for controlled deletion of resources when they are evicted
// from the cache, while avoiding race conditions at generation time.
class Value<T> {
  private count = 1;
  resolved?: Resolve<T>;
  disposer?: () => void;
  private deps: Value<unknown>[] = [];

  constructor(
    readonly value: T,
    readonly version: number,
    readonly debugName: string,
    onReady: (value: Value<T>) => Value<unknown>[]
  ) {
    ++undisposedValues.value;

    // Wait until the new value is finished being built. After which, we set
    // the local cached value and clear held references.
    const withResolved = (resolved: Resolve<T>) => {
      this.resolved = resolved;
      if (isDisposable(this.resolved)) {
        this.disposer = this.resolved.dispose.bind(this.resolved);
        this.resolved.dispose = doNothing;
      }
      this.deps = onReady(this);
      if (this.count == 0) {
        this.dispose();
      }
    };
    const onCatch = (error: any) => {
      log.error(`Resource "${debugName}" had error`, { error });
      this.deps = onReady(this);
      if (this.count == 0) {
        this.dispose();
      }
    };

    if (types.isPromise(value)) {
      value.then((x) => withResolved(x as Resolve<T>)).catch(onCatch);
    } else {
      try {
        withResolved(value as Resolve<T>);
      } catch (error) {
        onCatch(error);
      }
    }
  }

  dispose() {
    --undisposedValues.value;

    if (this.disposer) {
      this.disposer();
      this.disposer = undefined;
      this.resolved = undefined;
    }
    this.deps.forEach((d) => d.decrement());
  }

  decrement() {
    if (this.count > 0) {
      this.count -= 1;
      if (this.count == 0) {
        this.dispose();
      }
    }
  }

  increment() {
    if (this.count > 0) {
      this.count += 1;
    }
  }
}

// Nodes manage the life cycle of values in the resource cache. They build new
// values on demand, cache output, and provide transitive invalidation through
// dependency tracking.
export class Node<T> {
  request: number;
  deps = new Set<Node<unknown>>();
  subs = new Set<Node<unknown>>();
  cacheDeps = new Set<Node<unknown>>();
  value?: Value<T>;
  cache?: Resolve<T>;

  constructor(
    readonly genFn: GenFn<T>,
    readonly depFn: DepFn,
    readonly path: string,
    readonly debugName: string,
    public version = 0
  ) {
    this.request = version + 1;
  }

  build() {
    ok(this.stale(), "Attempt to build fresh resource");
    ok(this.subs.size == 0, "Invalid lingering subscribers");

    // Build a new value. We hold references to dependent values while building
    // so that they cannot be deleted until the build is complete.
    const valueDeps = new Set<Value<unknown>>();
    const nodeDeps = new Set<Node<unknown>>();
    try {
      const value = this.genFn({
        get: <U>(path: string, ...args: Arg[]) => {
          // Get the node dependency and its value. The get call could invoke
          // a recursive build on the depended on node.
          const dep = this.depFn(path, args);
          const val = dep.get();

          // Immediately subscribe to the nodes changes. This ensure that any
          // upstream invalidation will propagate to this node. We also record
          // the dependency for cache eviction purposes.
          this.deps.add(dep);
          nodeDeps.add(dep);
          dep.subs.add(this);

          // Get the value of the dependency, and hold a reference to it. This
          // get call could invoke a recursive build for the dependency.
          if (!valueDeps.has(val)) {
            valueDeps.add(val);
            val.increment();
          }

          return val.value as U;
        },
      });

      // Update the value reference to the new value. It might not be ready
      // immediately due to async resources. We register a callback for when
      // it's ready to free build references.
      const prev = this.value;
      this.value = new Value(value, this.request, this.debugName, (value) => {
        prev?.decrement();
        if (!this.cache || this.version <= value.version) {
          this.version = value.version;
          this.cache = value.resolved;
          this.cacheDeps = nodeDeps;
          this.deps = new Set([...this.deps, ...this.cacheDeps]);
        }
        return Array.from(valueDeps);
      });
    } catch (error: any) {
      valueDeps.forEach((dep) => dep.decrement());
      throw error;
    }
  }

  clear() {
    this.deps.forEach((dep) => dep.subs.delete(this));
    this.deps = this.cacheDeps;
    this.subs.clear();
    this.request += 1;
  }

  free() {
    this.clear();
    this.value?.decrement();
    this.value = undefined;
    this.cache = undefined;
    this.cacheDeps.clear();
  }

  // True if a build needs to be triggered in order to bring this resource
  // up-to-date.
  stale() {
    return !this.value || this.value.version < this.request;
  }

  cached() {
    if (this.stale()) {
      this.build();
    }
    return this.cache;
  }

  get() {
    if (this.stale()) {
      this.build();
    }
    return this.value!;
  }
}

export interface ResourceDeps {
  get<T>(path: string, ...args: Arg[]): T;
}

export interface NodeCollector {
  preserve(node: Node<unknown>): void;
  collect(nodes: NodeMap): void;
}

// Helper class for implementing keep set based garbage collectors.
export class KeepPurger {
  private todo: Node<unknown>[] = [];
  private keep: Set<Node<unknown>> = new Set();

  keepSize() {
    return this.keep.size;
  }

  preserve(node: Node<unknown>) {
    this.todo.push(node);
  }

  preserveToKeep(onNewKeep?: (node: Node<unknown>) => void) {
    // Add all nodes mark for preservation and their deps to the keep set.
    while (this.todo.length > 0) {
      const node = this.todo.pop()!;
      if (this.keep.has(node)) {
        continue;
      } else {
        this.keep.add(node);
        this.todo.push(...Array.from(node.deps));
        onNewKeep?.(node);
      }
    }
  }

  purge(nodes: NodeMap) {
    // TODO: Topologically sort the purge set here for correct deletion order.
    // TODO: Figure out a way to amortize these deletions over multiple cleanup
    // calls so that we don't cause frame spikes during a large purge event.
    timeCode("resources:purge", () => {
      const purge: Arg[][] = [];
      for (const [key, node] of nodes) {
        if (this.keep.has(node)) {
          continue;
        }
        node.free();
        purge.push(key);
      }
      for (const key of purge) {
        nodes.delete(key);
      }
      // Clear all keep sets.
      this.keep.clear();
    });
  }
}

export class DefaultNodeCollector implements NodeCollector {
  private capacity: number;
  private keepPurger = new KeepPurger();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  preserve(node: Node<unknown>) {
    this.keepPurger.preserve(node);
  }

  collect(nodes: NodeMap) {
    this.keepPurger.preserveToKeep();

    // If the keep set is over capacity, purge the resource map.
    if (this.keepPurger.keepSize() >= this.capacity) {
      this.keepPurger.purge(nodes);
    }
  }
}

function normalizeKey(key: Arg): string | number {
  switch (typeof key) {
    case "string":
    case "number":
      return key;
    default:
      return String(key);
  }
}

// Nested maps to arrow for array-key based lookup of a Node
// Will appropriately free() values upon deletion.
export class NodeMap {
  private readonly contents = new Map<
    string | number,
    NodeMap | Node<unknown>
  >();
  public size = 0;

  // Get a Node by key, or undefined if not present.
  get(path: Arg[], idx = 0): Node<unknown> | undefined {
    ok(path.length > idx);
    const key = normalizeKey(path[idx]);
    const value = this.contents.get(key);
    if (value instanceof NodeMap) {
      return value.get(path, idx + 1);
    } else if (idx === path.length - 1) {
      return value;
    }
  }

  // Delete a node by key, return true if actually deleted.
  delete(path: Arg[], idx = 0): boolean {
    ok(path.length > idx);
    const key = normalizeKey(path[idx]);
    const value = this.contents.get(key);
    if (value instanceof NodeMap) {
      if (value.delete(path, idx + 1)) {
        this.size -= 1;
        if (value.size === 0) {
          this.contents.delete(key);
        }
        return true;
      }
    } else if (idx === path.length - 1) {
      if (value) {
        ok(value instanceof Node);
        this.size -= 1;
        this.contents.delete(key);
        return true;
      }
    }
    return false;
  }

  // Set a key to a given value, return true if this key did not previously exist.
  set(path: Arg[], value: Node<unknown>, idx = 0): boolean {
    ok(path.length > idx);
    const key = normalizeKey(path[idx]);
    if (idx === path.length - 1) {
      const oldSize = this.contents.size;
      this.contents.set(key, value);
      if (oldSize !== this.contents.size) {
        this.size += 1;
        return true;
      }
      return false;
    }
    const existing = this.contents.get(key);
    if (existing instanceof NodeMap) {
      if (existing.set(path, value, idx + 1)) {
        this.size += 1;
        return true;
      }
      return false;
    } else if (existing) {
      throw new Error(`Resource path conflict: ${key}`);
    }
    const nodeMap = new NodeMap();
    this.contents.set(key, nodeMap);
    nodeMap.set(path, value, idx + 1);
    this.size += 1;
    return true;
  }

  // Clear all values.
  clear() {
    this.contents.clear();
    this.size = 0;
  }

  // Iterate over all values in the map.
  *[Symbol.iterator](
    base: Arg[] = []
  ): IterableIterator<[Arg[], Node<unknown>]> {
    for (const [key, value] of this.contents) {
      if (value instanceof NodeMap) {
        yield* value[Symbol.iterator]([...base, key]);
      } else {
        yield [[...base, key], value];
      }
    }
  }
}

export interface AuditArgs {
  download?: boolean;
  mode?: "dot" | "csv";
}

export class Resources {
  private readonly nodes = new NodeMap();

  constructor(
    private readonly fns: Map<string, GenFn<unknown>>,
    private readonly collector: NodeCollector,
    private readonly baseVersion = 0
  ) {
    makeCvalHook({
      path: ["resources", "nodes"],
      help: "Number of nodes currently managed by the resource system.",
      collect: () => this.nodes.size,
    });
  }

  private node<T>(path: string, args: Arg[]): Node<T> {
    const key = [path, ...args];
    let val = this.nodes.get(key);
    if (!val) {
      const fn = this.fns.get(path) as GenFn<T>;
      ok(fn, `No resource function for path ${path}`);
      val = new Node<T>(
        (deps) => fn(deps, ...args),
        (path, args) => this.node(path, args),
        path,
        JSON.stringify(key),
        this.baseVersion
      );
      this.nodes.set(key, val);
    }
    this.collector.preserve(val);
    return val as Node<T>;
  }

  private propagate(node: Node<any>, fn: (node: Node<any>) => void) {
    const todo = [node];
    const done = new Set<Node<any>>();
    while (todo.length > 0) {
      const node = todo.pop()!;
      if (done.has(node)) {
        continue;
      } else {
        done.add(node);
        todo.push(...Array.from(node.subs));
        fn(node);
      }
    }
  }

  audit({ download = true, mode }: AuditArgs) {
    const [output, extension] = (() => {
      mode ??= "csv";
      switch (mode) {
        case "csv":
          {
            const toSort: [string, number, string[]][] = [];
            for (const [, node] of this.nodes) {
              toSort.push([
                node.debugName,
                node.version,
                mapSet(node.deps, (e) => e.debugName),
              ]);
            }
            const ret = sortBy(toSort, (e) => -e[1]);
            return [
              `resource,version,deps\n${ret
                .map((e) => `${e[0]},${e[1]},${e[2].join("; ")}`)
                .join("\n")}`,
              "csv",
            ];
          }
          break;
        case "dot":
          {
            const nodes = new Set<string>();
            const edges = new Set<string>();
            const dotNode = (node: Node<unknown>) => {
              const path = node.path;
              const id = path.replaceAll("/", "_");
              nodes.add(`${id} [label=${JSON.stringify(path)}]`);
              return id;
            };
            for (const [, node] of this.nodes) {
              for (const dep of node.deps) {
                edges.add(`${dotNode(node)} -> ${dotNode(dep)}`);
              }
            }
            return [
              `digraph G {\n${Array.from(nodes).join("\n")}\n${Array.from(
                edges
              ).join("\n")}\n}`,
              "dot",
            ];
          }
          break;
        default:
          assertNever(mode);
          throw new Error("Unreachable");
      }
    })();
    if (download && !process.env.IS_SERVER) {
      downloadTextFile(`audit.${extension}`, output);
    }
    return output;
  }

  count() {
    return this.nodes.size;
  }

  clear() {
    for (const [_, node] of this.nodes) {
      node.free();
    }
    this.nodes.clear();
  }

  collect() {
    this.collector.collect(this.nodes);
  }

  version(path: string, ...args: Arg[]): number {
    return this.node<any>(path, args).request;
  }

  cachedVersion(path: string, ...args: Arg[]): number {
    return this.node<any>(path, args).version;
  }

  stale(path: string, ...args: Arg[]) {
    return this.node<any>(path, args).stale();
  }

  get<T>(path: string, ...args: Arg[]): T {
    return this.node<T>(path, args).get().value;
  }

  cached<T>(path: string, ...args: Arg[]): Resolve<T> | undefined {
    return this.node<T>(path, args).cached();
  }

  peek<T>(path: string, ...args: Arg[]): Resolve<T> | undefined {
    return this.node<T>(path, args).cache;
  }

  with<T, R>(path: string, args: Arg[], fn: (val: T) => R) {
    const wrapper = this.node<T>(path, args).get();
    wrapper.increment();
    return Promise.resolve(wrapper.value)
      .then(fn)
      .finally(() => wrapper.decrement());
  }

  invalidate(path: string, ...args: Arg[]): void {
    const node = this.nodes.get([path, ...args]);
    if (node) {
      this.propagate(node, (node: Node<any>) => {
        node.clear();
        return node.stale();
      });
    }
  }

  update<T>(path: string, ...args: [...Arg[], (val: T) => void]): void {
    const fn = args.pop()! as (val: T) => void;
    try {
      fn(this.get<T>(path, ...args));
    } finally {
      this.invalidate(path, ...args);
    }
  }

  set<T extends {}>(
    path: string,
    ...args: [...Arg[], Exclude<T, any[]>]
  ): void {
    const val = args.pop()! as T;
    this.update(path, ...args, (old: Record<string, any>) => {
      clearObjectProperties(old);
      Object.assign(old, val);
    });
  }
}

type CreateFn<T, A extends Arg[]> = (deps: ResourceDeps, ...args: [...A]) => T;

export class ResourcesBuilder {
  private fns = new Map<string, GenFn<any>>();
  private collector: NodeCollector | undefined;
  private baseVersion: number | undefined;

  setCollector(collector: NodeCollector) {
    this.collector = collector;
    return this;
  }

  setBaseVersion(version: number) {
    this.baseVersion = version;
    return this;
  }

  add<T, A extends Arg[]>(path: string, fn: CreateFn<T, A>) {
    ok(!this.fns.has(path), `Duplicate resource path ${path}`);
    ok(RESOURCE_PATH.test(path), `Invalid resource path: ${path}`);
    this.fns.set(path, fn as GenFn<T>);
    return this;
  }

  build() {
    return new Resources(
      this.fns,
      this.collector ?? new DefaultNodeCollector(Infinity),
      this.baseVersion
    );
  }
}
