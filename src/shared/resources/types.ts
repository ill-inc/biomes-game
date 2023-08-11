//* eslint-disable @typescript-eslint/no-unsafe-return */
import type {
  AuditArgs,
  NodeCollector,
  ResourceDeps,
} from "@/shared/resources/core";
import { ResourcesBuilder } from "@/shared/resources/core";
import type { PathMap } from "@/shared/resources/path_map";

export type Key<P> = keyof P & string;
export type Args<P extends PathMap<P>, K extends Key<P>> = P[K]["args"];
export type Ret<P extends PathMap<P>, K extends Key<P>> = P[K]["ret"];
export type Resolve<T> = T extends PromiseLike<infer U> ? U : T;

export interface TypedResourceDeps<P extends PathMap<P>> {
  get<K extends Key<P>>(path: K, ...args: [...Args<P, K>]): Ret<P, K>;
}
export interface TypedResources<P extends PathMap<P>> {
  count(): number;
  clear(): void;
  collect(): void;
  audit(args?: AuditArgs): unknown;
  version<K extends Key<P>>(path: K, ...args: [...Args<P, K>]): number;
  cachedVersion<K extends Key<P>>(path: K, ...args: [...Args<P, K>]): number;
  stale<K extends Key<P>>(path: K, ...args: [...Args<P, K>]): boolean;
  get<K extends Key<P>>(path: K, ...args: [...Args<P, K>]): Ret<P, K>;
  cached<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>]
  ): Resolve<Ret<P, K>> | undefined;
  peek<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>]
  ): Resolve<Ret<P, K>> | undefined;
  with<K extends Key<P>, R>(
    path: string,
    args: [...Args<P, K>],
    fn: (val: Resolve<Ret<P, K>>) => R
  ): Promise<R>;
  invalidate<K extends Key<P>>(path: K, ...args: [...Args<P, K>]): void;
  set<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>, Exclude<Ret<P, K>, any[]>]
  ): void;
  update<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>, (val: Ret<P, K>) => void]
  ): void;
}

export type CreateFn<P extends PathMap<P>, K extends Key<P>> = (
  ...args: [TypedResourceDeps<P>, ...Args<P, K>]
) => Ret<P, K>;

export class TypedResourcesBuilder<P extends PathMap<P>> {
  private readonly untyped = new ResourcesBuilder();

  setCollector(collector: NodeCollector) {
    this.untyped.setCollector(collector);
    return this;
  }

  setBaseVersion(baseVersion: number) {
    this.untyped.setBaseVersion(baseVersion);
    return this;
  }

  add<K extends Key<P>>(path: K, fn: CreateFn<P, K>) {
    this.untyped.add(path, (deps: ResourceDeps, ...args: Args<P, K>) => {
      return fn(deps as TypedResourceDeps<P>, ...args);
    });
    return this;
  }

  build() {
    return this.untyped.build() as TypedResources<P>;
  }
}
