const lazyObjectMaterializedKeys = Symbol.for("lazyObjectKeys");

export type LazyObjectSpec = Record<string | number | symbol, () => unknown>;
export type MaterializeLazyObject<T extends LazyObjectSpec> = {
  [K in keyof T]: ReturnType<T[K]>;
};

export type MaterializedLazyObjectKeys<T extends LazyObjectSpec> = Exclude<
  keyof T,
  typeof lazyObjectMaterializedKeys
>;

export function lazyObject<T extends LazyObjectSpec>(o: T) {
  const propertySpec: PropertyDescriptorMap = {};
  for (const [k, v] of Object.entries(o)) {
    propertySpec[k] = {
      configurable: true,
      enumerable: true,
      get(this: any) {
        delete this[k];
        this[lazyObjectMaterializedKeys].push(k as keyof T);
        return (this[k] = v());
      },
    };
  }
  const memo: any = {
    [lazyObjectMaterializedKeys]: [] as (keyof T)[],
  };
  Object.defineProperties(memo, propertySpec);
  return memo as MaterializeLazyObject<T>;
}

export function getLazyObjectMaterializedValues<T extends LazyObjectSpec>(
  o: MaterializeLazyObject<T> & { [lazyObjectMaterializedKeys]?: (keyof T)[] }
) {
  const out: (typeof o)[keyof T][] = [];
  for (const key of o[lazyObjectMaterializedKeys] ?? []) {
    out.push(o[key]);
  }
  return out;
}

export function lazy<T>(f: () => T): () => T {
  let initialized = false;
  let value: T | undefined;
  return () => {
    if (!initialized) {
      value = f();
      initialized = true;
    }
    return value as T;
  };
}
