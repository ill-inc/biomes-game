import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import { ok } from "assert";
import { entries, keys, mapValues, reverse, valuesIn, zipObject } from "lodash";

type Factory<Key extends keyof Context, Context> = (
  loader: RegistryLoader<Context>
) => Promise<Context[Key]>;

type Factories<Context> = { [Key in keyof Context]: Factory<Key, Context> };

export type Timing<Context> = { [Key in keyof Context]?: number };

class Scope<Context> {
  private readonly stack = new Set<keyof Context>();

  fork(key: keyof Context) {
    ok(!this.stack.has(key), "Circular dependency detected");

    const scope = new Scope<Context>();
    scope.stack.add(key);
    for (const key of this.stack) {
      scope.stack.add(key);
    }
    return scope;
  }

  toString() {
    return Array.from(this.stack).join(" -> ");
  }
}

export class RegistryLoader<Context> {
  private readonly partial: Partial<Context>;
  public totalTimeInThisLoader = 0;
  public loaded: boolean = false;

  constructor(
    private readonly scope: Scope<Context>,
    private readonly factories: Factories<Context>,
    public readonly timing: Timing<Context>,
    baseContext?: Partial<Context>
  ) {
    this.partial = baseContext ?? {};
  }

  get context(): Context | undefined {
    if (this.loaded) {
      return this.partial as Context;
    }
  }

  provide<A extends any[], R>(fn: (ctx: Context, ...args: A) => R) {
    return (...args: A) => {
      return fn(this.partial as Context, ...args);
    };
  }

  async getAll<Keys extends (keyof Context)[]>(
    ...keys: [...Keys]
  ): Promise<{
    [L in Keys[number]]: Context[L];
  }> {
    const vals = await Promise.all(keys.map((e) => this.get(e)));
    return zipObject(keys, vals) as any;
  }

  async getOptional<Key extends keyof Context>(
    key: Key
  ): Promise<Context[Key] | undefined> {
    if (this.partial[key] === undefined && !this.factories[key]) {
      return undefined;
    }
    try {
      if (this.partial[key] === undefined) {
        const timer = new Timer();
        this.timing[key] = -1;
        const childLoader = new RegistryLoader(
          this.scope.fork(key),
          this.factories,
          this.timing,
          this.partial
        );
        this.partial[key] = await this.factories[key](childLoader);
        const delta = timer.elapsed;
        this.timing[key] = Math.max(
          0,
          delta - childLoader.totalTimeInThisLoader
        );
        this.totalTimeInThisLoader += delta;
      }
      return this.partial[key]! as Context[Key];
    } catch (error) {
      log.error(`Error loading '${String(key)}'`, {
        error,
        scope: this.scope.toString(),
      });
      throw error;
    }
  }

  async get<Key extends keyof Context>(key: Key): Promise<Context[Key]> {
    const val = await this.getOptional(key);
    ok(
      this.factories[key] || val !== undefined,
      `Attempt to load unbound: "${String(key)}"`
    );
    return val!;
  }

  toJSON() {
    return {
      loaded: this.loaded,
      timing: this.timing,
    };
  }

  async build(): Promise<Context> {
    const timer = new Timer();
    if (!this.loaded) {
      await this.getAll(...(keys(this.factories) as (keyof Context)[]));
      this.loaded = true;
    }
    maybeSlowlog(this.timing, timer.elapsed);
    return this.context!;
  }
}

function memoize<Key extends keyof Context, Context>(
  factory: Factory<Key, Context>
) {
  let memo: Promise<Context[Key]> | undefined;
  return (loader: RegistryLoader<Context>) => {
    if (memo === undefined) {
      memo = Promise.resolve(factory(loader));
    }
    return memo;
  };
}

function maybeSlowlog<Context>(timing: Timing<Context>, total: number) {
  let slowKey = false;
  for (const time of valuesIn(timing)) {
    if (typeof time !== "number") {
      continue;
    }
    if (time > 50) {
      slowKey = true;
    }
  }
  if (slowKey || total > 1000) {
    log.info(`Slow registry load, took ${Math.floor(total)}ms`, {
      timing: mapValues(timing, (time) =>
        typeof time === "number" ? `${time.toFixed(3)}ms` : undefined
      ),
    });
  }
}

export type WithStop<T> = T & { stop(): Promise<void> };

export class RegistryBuilder<Context extends {}> {
  private readonly factories: Partial<Factories<Context>> = {};
  private readonly keysToLoadFirst: Array<keyof Context> = [];

  bind<Key extends keyof Context>(
    key: Key,
    factory: Factory<Key, Context>
  ): RegistryBuilder<Context> {
    this.factories[key] = memoize(factory);
    return this;
  }

  // Load early components will be before others, and should minimize
  // dependencies as it will also pull them earlier.
  loadEarly<Key extends keyof Context>(key: Key): RegistryBuilder<Context> {
    this.keysToLoadFirst.push(key);
    return this;
  }

  set<Key extends keyof Context>(
    key: Key,
    val: Context[Key]
  ): RegistryBuilder<Context> {
    return this.bind(key, () => Promise.resolve(val));
  }

  install(fn: (builder: RegistryBuilder<Context>) => void) {
    fn(this);
    return this;
  }

  buildLoader<BaseContext extends Partial<Context>>(
    derivedFrom?: BaseContext
  ): RegistryLoader<Context> {
    const ret: Partial<Context> = derivedFrom ?? {};
    return new RegistryLoader<Context>(
      new Scope(),
      this.factories as Factories<Context>,
      {},
      ret
    );
  }

  async build<BaseContext extends Partial<Context>>(
    derivedFrom?: BaseContext
  ): Promise<WithStop<Context>> {
    const loader = this.buildLoader(derivedFrom);
    for (const key of this.keysToLoadFirst) {
      await loader.get(key);
    }
    const ret = await loader.build();
    (ret as any).stop = async () => {
      // Note, we use 'reverse' here to ensure we stop things
      // in the opposite of insertion order (ie. generation order).
      for (const [key, value] of reverse(entries(ret))) {
        if (
          !value ||
          typeof value !== "object" ||
          !("stop" in value) ||
          typeof value.stop !== "function"
        ) {
          continue;
        }
        try {
          await value.stop();
        } catch (error) {
          log.error(`Error stopping '${key}'`, { error });
        }
      }
    };
    return ret as WithStop<Context>;
  }
}
