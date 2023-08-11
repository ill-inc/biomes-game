import type {
  CacheBackend,
  CachePathMap,
  CArgs,
  CKey,
  CRet,
} from "@/server/shared/cache/types";
import EventEmitter from "events";
import { last, take } from "lodash";
import LRUCache from "lru-cache";

export class MemoryCacheBackend implements CacheBackend {
  readonly backing = new LRUCache<string, unknown>({
    max: 5000,
    ttl: 5 * 60,
    noDeleteOnFetchRejection: true,
    allowStale: true,
  });

  async get<T>(key: string) {
    return this.backing.get<T>(key) ?? null;
  }

  async set<T>(key: string, val: T, options?: { ttl: number }) {
    this.backing.set(key, val, options);
  }

  async del(key: string) {
    this.backing.delete(key);
  }
}

// TODO: Consider making this restricted indexing [we currently prefix scan everything].
export class PrefixScannableMemoryCacheBackend extends MemoryCacheBackend {
  async getByPrefix<T>(keyPrefix: string) {
    const result: T[] = [];
    for (const [key, val] of this.backing.entries()) {
      if (key.startsWith(keyPrefix)) {
        result.push(val as T);
      }
    }
    return result;
  }
}

export class GenericCache<
  P extends CachePathMap<P>,
  Backend extends CacheBackend = CacheBackend
> {
  // Map of all resources (by cacheKey) currently being computed to a promise
  // representing their value upon completion.
  private readonly currentComputations = new Map<string, Promise<unknown>>();
  emitter: EventEmitter = new EventEmitter();

  constructor(public readonly backend: Backend) {
    this.emitter.setMaxListeners(1000);
  }

  private key(path: string, args: any[]) {
    return `${path}:${args.join(":")}`;
  }

  private async getWithKeyString<R>(
    cacheKey: string
  ): Promise<[value: R | null, found: boolean]> {
    const ret = await this.backend.get<[R]>(cacheKey);
    if (ret && ret.length === 1) {
      return [ret[0], true];
    } else {
      return [null, false];
    }
  }

  private async setWrappedWithKeyString<R>(
    ttl: number,
    cacheKey: string,
    value: R
  ) {
    await this.backend.set(cacheKey, [value], { ttl });
    this.emitter.emit(`invalidate:${cacheKey}`, value);
  }

  private async delWithKeyString(cacheKey: string) {
    await this.backend.del(cacheKey);
    this.emitter.emit(`invalidate:${cacheKey}`, null);
  }

  private async getByPrefixWithKeyString<R>(
    cacheKeyPrefix: string
  ): Promise<R[]> {
    if (!this.backend.getByPrefix) {
      return []; // Backend doesn't support prefix fetches.
    }
    return (await this.backend.getByPrefix<[R]>(cacheKeyPrefix)).flatMap(
      (ret) => {
        return ret && ret.length === 1 ? [ret[0]] : [];
      }
    );
  }

  private async maybeGetOrComputeWithKeyString<R>(
    doGet: boolean,
    ttl: number,
    cacheKey: string,
    generator: () => Promise<R>
  ): Promise<R> {
    const [cachedValue, found] = doGet
      ? await this.getWithKeyString<R>(cacheKey)
      : [null, false];

    if (found) {
      return cachedValue as R;
    }

    // Check if the resource is currently being computed from another callsite,
    // and if so just wait on that.
    const existingComputationPromise = this.currentComputations.get(cacheKey);
    if (existingComputationPromise) {
      return existingComputationPromise as Promise<R>;
    }

    // Okay, the value is not cached and nobody is computing it, so that means
    // we need to compute it (and publish our computation promise so others
    // can wait on it).
    const promise = generator().then((toSet) => {
      void this.setWrappedWithKeyString(ttl, cacheKey, toSet);
      this.currentComputations.delete(cacheKey);
      return toSet;
    });

    this.currentComputations.set(cacheKey, promise);
    return promise;
  }

  async get<K extends CKey<P>>(path: K, ...args: [...CArgs<P, K>]) {
    const cacheKey = this.key(path, args);
    return this.getWithKeyString<CRet<P, K>>(cacheKey);
  }

  async getManySame<K extends CKey<P>>(path: K, items: [...CArgs<P, K>][]) {
    return Promise.all(
      items.map((item) => {
        const cacheKey = this.key(path, item);
        return this.getWithKeyString<CRet<P, K>>(cacheKey);
      })
    );
  }

  async del<K extends CKey<P>>(path: K, ...args: [...CArgs<P, K>]) {
    return this.delWithKeyString(this.key(path, args));
  }

  async set<K extends CKey<P>>(
    ttl: number,
    path: K,
    ...args: [...CArgs<P, K>, CRet<P, K>]
  ) {
    const val = last(args) as CRet<P, K>;
    return this.setWrappedWithKeyString(
      ttl,
      this.key(path, take(args, args.length - 1)),
      val
    );
  }

  async setManySame<K extends CKey<P>>(
    ttl: number,
    path: K,
    items: [...CArgs<P, K>, CRet<P, K>][]
  ) {
    return Promise.all(
      items.map(async (item) => {
        const val = last(item) as CRet<P, K>;
        return this.setWrappedWithKeyString(
          ttl,
          this.key(path, take(item, item.length - 1) as [...CArgs<P, K>]),
          val
        );
      })
    );
  }

  addLocalInvalidateListener<K extends CKey<P>>(
    path: K,
    ...args: [...CArgs<P, K>, (v: CRet<P, K>) => unknown]
  ) {
    const cb = last(args) as () => unknown;
    const cacheKey = this.key(path, take(args, args.length - 1));
    this.emitter.addListener(`invalidate:${cacheKey}`, cb);
  }

  removeLocalInvalidateListener<K extends CKey<P>>(
    path: K,
    ...args: [...CArgs<P, K>, (v: CRet<P, K>) => unknown]
  ) {
    const cb = last(args) as () => unknown;
    const cacheKey = this.key(path, take(args, args.length - 1));
    this.emitter.removeListener(`invalidate:${cacheKey}`, cb);
  }

  async getByPrefix<K extends CKey<P>>(
    path: K,
    ...args: [...CArgs<P, K>]
  ): Promise<CRet<P, K>[]> {
    const cacheKeyPrefix = this.key(path, args);
    return this.getByPrefixWithKeyString(cacheKeyPrefix);
  }

  async getOrCompute<K extends CKey<P>>(
    ttl: number,
    path: K,
    ...args: [...CArgs<P, K>, () => Promise<CRet<P, K>>]
  ) {
    return this.maybeGetOrCompute(true, ttl, path, ...args);
  }

  async maybeGetOrCompute<K extends CKey<P>>(
    doGet: boolean,
    ttl: number,
    path: K,
    ...args: [...CArgs<P, K>, () => Promise<CRet<P, K>>]
  ) {
    const generator = last(args) as () => Promise<CRet<P, K>>;
    const cacheKey = this.key(path, take(args, args.length - 1));
    return this.maybeGetOrComputeWithKeyString(doGet, ttl, cacheKey, generator);
  }

  async getOrComputeManySame<K extends CKey<P>>(
    ttl: number,
    path: K,
    items: [...CArgs<P, K>, () => Promise<CRet<P, K>>][]
  ) {
    return this.maybeGetOrComputeManySame(true, ttl, path, items);
  }

  async maybeGetOrComputeManySame<K extends CKey<P>>(
    doGet: boolean,
    ttl: number,
    path: K,
    items: [...CArgs<P, K>, () => Promise<CRet<P, K>>][]
  ) {
    return Promise.all(
      items.map((item) => {
        const generator = last(item) as () => Promise<CRet<P, K>>;
        const cacheKey = this.key(path, take(item, item.length - 1));
        return this.maybeGetOrComputeWithKeyString(
          doGet,
          ttl,
          cacheKey,
          generator
        );
      })
    );
  }
}
