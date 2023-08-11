import { isDisposable } from "@/shared/disposable";
import type { Node, NodeCollector, NodeMap } from "@/shared/resources/core";
import { KeepPurger } from "@/shared/resources/core";
import type { PathMap } from "@/shared/resources/path_map";
import type {
  Args,
  CreateFn,
  Key,
  Resolve,
  Ret,
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { TypedResourcesBuilder } from "@/shared/resources/types";
import { ifPromiseThen } from "@/shared/util/async";
import { makeCvalHook } from "@/shared/util/cvals";
import { ok } from "assert";
import { isEqual } from "lodash";

export type PathStats = {
  // Number of pending in-process builds for the given resource path across
  // all its arguments.
  activeBuilds: number;
};

export class ResourcesStats<P extends PathMap<P>> {
  private _pathStats: Map<string, PathStats> = new Map();

  pathStats(path: string): PathStats {
    let stat = this._pathStats.get(path);
    if (!stat) {
      stat = { activeBuilds: 0 };
      this._pathStats.set(path, stat);
    }
    return stat;
  }

  wrapFn<K extends Key<P>, Args extends any[], R>(
    path: K,
    fn: (...args: Args) => R
  ): (...args: Args) => R {
    const stat = this.pathStats(path);
    return (...args: Args) => {
      ++stat.activeBuilds;
      const value = fn(...args);
      void ifPromiseThen(value, () => --stat.activeBuilds);
      return value;
    };
  }
}

export type UpdateFn<P extends PathMap<P>, K extends Key<P>> = (
  deps: TypedResourceDeps<P>,
  resource: Ret<P, K>,
  ...args: Args<P, K>
) => void | Promise<void>;

type PromiseImpliedByPromise<A, B> = B extends Promise<infer _T>
  ? A extends Promise<infer _U>
    ? A
    : never
  : A;

type AddOnceState<R> = {
  value: { v: R } | undefined;
  valueDispose: (() => void) | undefined;
  dispose: () => void;
};

// Setup the types and definitions for different "size classes" of resources,
// such that they can be assigned different capacities in the collector.
export const biomesResourceCapacityLabels = ["blockMeshes"] as const;
export type BiomesResourceCapacityLabel =
  (typeof biomesResourceCapacityLabels)[number];
export type BiomesResourceLabeledCapacities = {
  [K in BiomesResourceCapacityLabel]?: number;
};

export type BiomesResourceCapacities = {
  count: number;
  labels?: BiomesResourceLabeledCapacities;
};

export interface BiomesNodeCollectorParams {
  capacities?: BiomesResourceCapacities;
}

export class BiomesNodeCollector implements NodeCollector {
  private capacities: BiomesResourceCapacities;
  private pathToOption = new Map<string, BiomesResourceAddOptions<unknown>>();
  private keepPurger = new KeepPurger();
  private clearVersion = 0;
  // Usage towards the labelled capacities.
  private labelCapacityUsage = new Map<BiomesResourceCapacityLabel, number>();

  constructor(options?: BiomesNodeCollectorParams) {
    this.capacities = options?.capacities ?? { count: Infinity };
    makeCvalHook({
      path: ["resources", "gc", "keepSetSize"],
      help: "Total number of nodes currently preserved in the next GC.",
      collect: () => this.keepPurger.keepSize(),
    });
    for (const label of biomesResourceCapacityLabels) {
      makeCvalHook({
        path: ["resources", "gc", "labeledCapacities", label],
        help: `Total number of nodes currently preserved in the next GC for size class "${label}"`,
        collect: () => this.labelCapacityUsage.get(label) ?? 0,
      });
    }
    makeCvalHook({
      path: ["resources", "gc", "numGcs"],
      help: "Number of times garbage has been collected.",
      collect: () => this.clearVersion,
    });
  }

  preserve(node: Node<unknown>) {
    this.keepPurger.preserve(node);
  }

  collect(nodes: NodeMap) {
    // Add to the node's keep set for their specified size class, so we can know
    // how many nodes are in each size class.
    this.keepPurger.preserveToKeep((node: Node<unknown>) => {
      const options = this.pathToOption.get(node.path);
      if (options?.labeledCapacities && node.value) {
        const clearVersion = this.clearVersion;
        for (const [label, usageFn] of Object.entries(
          options.labeledCapacities
        )) {
          void ifPromiseThen(usageFn(node.value.value), (count) => {
            if (this.clearVersion === clearVersion) {
              const capacityLabel = label as BiomesResourceCapacityLabel;
              const curVal = this.labelCapacityUsage.get(capacityLabel);
              this.labelCapacityUsage.set(capacityLabel, (curVal ?? 0) + count);
            }
          });
        }
      }
    });

    // Check that no size classes exceed their capacity.
    const overCapacity = (() => {
      if (this.keepPurger.keepSize() >= this.capacities.count) {
        return true;
      }

      for (const label of biomesResourceCapacityLabels) {
        const maybeCapacity = this.capacities.labels?.[label];
        if (
          maybeCapacity !== undefined &&
          (this.labelCapacityUsage.get(label) ?? 0) >= maybeCapacity
        ) {
          return true;
        }
      }

      return false;
    })();

    // If any size class is over capacity, purge all resources.
    // This is not limited to the over-capacity size class because resources from
    // there may be cross size class retention between resources.
    if (overCapacity) {
      this.keepPurger.purge(nodes);
      this.labelCapacityUsage.clear();
      ++this.clearVersion;
    }
  }

  // Used during construction to associate optional settings with some resource
  // paths.
  setOptionForPath<P extends PathMap<P>, K extends Key<P>>(
    path: K,
    options: BiomesResourceAddOptions<Ret<P, K>>
  ) {
    this.pathToOption.set(path, options);
  }
}

interface BiomesResourceAddOptions<R> {
  labeledCapacities?: {
    [K in BiomesResourceCapacityLabel]?: (v: R) => number | Promise<number>;
  };
}

export class BiomesResourcesBuilder<P extends PathMap<P>> {
  private builder: TypedResourcesBuilder<P> = new TypedResourcesBuilder();
  private collector: BiomesNodeCollector;
  private stats: ResourcesStats<P> | undefined;

  constructor(options?: {
    collectorParams?: BiomesNodeCollectorParams;
    stats?: ResourcesStats<P>;
  }) {
    this.collector = new BiomesNodeCollector(options?.collectorParams);
    this.builder.setCollector(this.collector);
    this.stats = options?.stats;
  }

  setBaseVersion(baseVersion: number) {
    this.builder.setBaseVersion(baseVersion);
    return this;
  }

  add<K extends Key<P>>(
    path: K,
    fn: CreateFn<P, K>,
    options?: BiomesResourceAddOptions<Ret<P, K>>
  ) {
    this.builder.add(path, this.stats ? this.stats.wrapFn(path, fn) : fn);
    if (options) {
      this.collector.setOptionForPath(path, options);
    }
    return this;
  }

  addDynamic<K extends Key<P>>(
    path: K,
    createFn: CreateFn<P, K>,
    updateFn: UpdateFn<P, K>,
    options?: BiomesResourceAddOptions<Ret<P, K>>
  ) {
    const initPath = `/init${path}`;
    this.addOnce(
      initPath as K,
      (deps, ...args) => createFn(deps, ...args),
      options
    );
    this.add(path, (deps, ...args) => {
      const init = deps.get<Ret<P, K>>(initPath, ...args);
      return ifPromiseThen(updateFn(deps, init, ...args), () => init);
    });
    return this;
  }

  // First creates a "cache" resource that persists across generations of the
  // main resource, but is not publicly accessible.
  addWithCache<K extends Key<P>, C>(
    path: K,
    createCacheFn: (
      ...args: [TypedResourceDeps<P>, C | undefined, ...Args<P, K>]
    ) => C,
    createFn: (...args: [TypedResourceDeps<P>, C, ...Args<P, K>]) => Ret<P, K>,
    options?: BiomesResourceAddOptions<Ret<P, K>>
  ) {
    const cachePath = `/cache${path}`;
    this.addOnce(
      cachePath as K,
      () => ({
        value: undefined,
        dispose() {
          if (isDisposable(this.value)) {
            this.value.dispose();
          }
        },
      }),
      options
    );
    this.add(path, (deps, ...args) => {
      const cache = deps.get<any>(cachePath, ...args);

      // First check to see if we need to cre-create the cache, then grab the value.
      return ifPromiseThen(
        ifPromiseThen(createCacheFn(deps, cache.value, ...args), (v) => {
          cache.value = v;
          return v;
        }),
        (c) => createFn(deps, c, ...args)
      );
    });
    return this;
  }

  addGlobal<K extends Key<P>>(
    path: K,
    global: Ret<P, K>,
    options?: BiomesResourceAddOptions<Ret<P, K>>
  ) {
    return this.add(path, () => global, options);
  }

  addOnce<K extends Key<P>>(
    path: K,
    createFn: CreateFn<P, K>,
    options?: BiomesResourceAddOptions<Ret<P, K>>
  ) {
    const oncePath = `/once${path}` as Key<P>;
    this.builder.add(
      oncePath,
      (): AddOnceState<Ret<P, K>> => ({
        value: undefined,
        valueDispose: undefined,
        dispose() {
          this.valueDispose?.();
        },
      })
    );
    if (options) {
      this.collector.setOptionForPath<P, K>(oncePath as K, {
        ...options,
        ...(options.labeledCapacities
          ? {
              labeledCapacities: Object.fromEntries(
                Object.entries(options.labeledCapacities).map(([k, fn]) => [
                  k,
                  (v: Ret<P, K>) => {
                    if (v.value === undefined) {
                      return 0;
                    }
                    return fn(v.value.v);
                  },
                ])
              ),
            }
          : {}),
      });
    }

    this.add(path, (deps, ...args) => {
      const state = deps.get(oncePath, ...args);
      if (state.value) {
        return state.value.v;
      }

      state.value = { v: createFn(deps, ...args) };

      return ifPromiseThen(state.value.v, (x: Ret<P, K>) => {
        if (isDisposable(x)) {
          state.valueDispose = x.dispose.bind(x);
          x.dispose = () => {};
        }
        return x;
      });
    });

    return this;
  }

  addHashChecked<
    K extends Key<P>,
    H,
    R extends PromiseImpliedByPromise<Ret<P, K>, H>
  >(
    path: K,
    genFn: (...args: [TypedResourceDeps<P>, ...Args<P, K>]) => R,
    hashFn: (deps: TypedResourceDeps<P>, ...args: Args<P, K>) => H,
    hashesEqualFn: (a: Awaited<H>, b: Awaited<H>) => boolean = (a, b) =>
      isEqual(a, b),
    options?: BiomesResourceAddOptions<Ret<P, K>>
  ) {
    const statePath = `/state${path}` as Key<P>;
    const buildPath = `/build${path}` as Key<P>;

    this.builder.add(statePath, () => ({
      version: 0,
      previousCheckData: undefined,
    }));

    this.addOnce(
      buildPath as K,
      ((deps, _version: number, ...args: Args<P, K>) => {
        return genFn(deps, ...args);
      }) as CreateFn<P, Key<P>>,
      options
    );

    this.add(path, (deps, ...args) => {
      return ifPromiseThen(
        hashFn(deps, ...args),
        (checkData: Awaited<H>): Ret<P, K> => {
          const state = deps.get(statePath, ...args);

          if (
            !state.previousCheckData ||
            !hashesEqualFn(checkData, state.previousCheckData.value)
          ) {
            ok(
              !isDisposable(checkData),
              "Disposable check data not supported."
            );
            state.previousCheckData = { value: checkData };
            ++state.version;
          }

          return deps.get(buildPath, state.version, ...args);
        }
      );
    });
  }

  build() {
    return this.builder.build();
  }
}

export class ResourceThrottler<P extends PathMap<P>> {
  count: number = 0;

  constructor(readonly resources: TypedResources<P>, readonly limit: number) {}

  cached<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>]
  ): Resolve<Ret<P, K>> | undefined {
    if (this.resources.stale(path, ...args)) {
      this.count += 1;
    }
    if (this.count <= this.limit) {
      return this.resources.cached<K>(path, ...args);
    } else {
      return this.resources.peek<K>(path, ...args);
    }
  }
}

export class ResourceLimiter<P extends PathMap<P>> {
  constructor(
    readonly resources: TypedResources<P>,
    readonly stats: ResourcesStats<P>,
    readonly limit: number
  ) {}

  cached<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>]
  ): Resolve<Ret<P, K>> | undefined {
    const { activeBuilds } = this.stats.pathStats(path);
    if (activeBuilds < this.limit) {
      return this.resources.cached<K>(path, ...args);
    } else {
      return this.resources.peek<K>(path, ...args);
    }
  }
}
