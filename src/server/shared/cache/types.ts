export interface CacheBackend {
  get: <T>(key: string) => Promise<T | null>;
  getByPrefix?: <T>(keyPrefix: string) => Promise<T[]>;
  set: <T>(key: string, val: T, options?: { ttl: number }) => Promise<void>;
  del: (key: string) => Promise<void>;
}

type Arg = string | number;
export type CachePathDef<A extends Arg[], R> = {
  args: A;
  ret: R;
};
export type CachePathMap<P> = { [K in keyof P]: CachePathDef<Arg[], any> };

export type CKey<P> = keyof P & string;
export type CArgs<P extends CachePathMap<P>, K extends CKey<P>> = P[K]["args"];
export type CRet<P extends CachePathMap<P>, K extends CKey<P>> = P[K]["ret"];
