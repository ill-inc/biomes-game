/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useEffectAsync } from "@/client/util/hooks";
import type { PathMap } from "@/shared/resources/path_map";
import type { TypedResources } from "@/shared/resources/types";
import { isPromise } from "@/shared/util/async";
import { Cval } from "@/shared/util/cvals";
import EventEmitter from "events";
import { isEqual } from "lodash";
import { useEffect, useRef, useState } from "react";

export type Key<P> = keyof P & string;
export type Args<P extends PathMap<P>, K extends Key<P>> = P[K]["args"];
export type Ret<P extends PathMap<P>, K extends Key<P>> = P[K]["ret"];
export type Resolve<T> = T extends PromiseLike<infer U> ? U : T;

export type AllKey<P> = Key<P>[];
export type AllRet<P extends PathMap<P>, A extends AllKey<P>> = {
  [I in keyof A]: A[I] extends Key<P> ? Ret<P, A[I]> : never;
};
export type Bundle<P extends PathMap<P>> = [Key<P>, ...Args<P, Key<P>>];

const reactEmitterListeners = new Cval({
  path: ["react", "emitterListeners"],
  help: "The number of things listening to react emitter.",
  initialValue: 0,
});

export class ReactResources<P extends PathMap<P>> {
  private resources: TypedResources<P>;
  emitter: EventEmitter = new EventEmitter();

  constructor(resources: TypedResources<P>) {
    this.resources = resources;
    this.emitter.setMaxListeners(1000);
  }

  key(bundle: Bundle<P>) {
    return bundle.join(":");
  }

  // Note: in TS 4.6 this used to do the right inference without all the extra overloads
  // if someone can figure out how to make it work again we should delete those.
  // type AllArgs<P extends PathMap<P>, A extends AllKey<P>> = {
  //  [I in keyof A]: A[I] extends Key<P> ? [A[I], ...Args<P, A[I]>] : never;
  // };
  // useAll<A extends AllKey<P>>(...paths: [...AllArgs<P, A>])
  useAll<K1 extends Key<P>>(path1: [K1, ...Args<P, K1>]): [Ret<P, K1>];
  useAll<K1 extends Key<P>, K2 extends Key<P>>(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>]
  ): [Ret<P, K1>, Ret<P, K2>];
  useAll<K1 extends Key<P>, K2 extends Key<P>, K3 extends Key<P>>(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>],
    path3: [K3, ...Args<P, K3>]
  ): [Ret<P, K1>, Ret<P, K2>, Ret<P, K3>];
  useAll<
    K1 extends Key<P>,
    K2 extends Key<P>,
    K3 extends Key<P>,
    K4 extends Key<P>
  >(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>],
    path3: [K3, ...Args<P, K3>],
    path4: [K4, ...Args<P, K4>]
  ): [Ret<P, K1>, Ret<P, K2>, Ret<P, K3>, Ret<P, K4>];
  useAll<
    K1 extends Key<P>,
    K2 extends Key<P>,
    K3 extends Key<P>,
    K4 extends Key<P>,
    K5 extends Key<P>
  >(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>],
    path3: [K3, ...Args<P, K3>],
    path4: [K4, ...Args<P, K4>],
    path5: [K5, ...Args<P, K5>]
  ): [Ret<P, K1>, Ret<P, K2>, Ret<P, K3>, Ret<P, K4>, Ret<P, K5>];
  useAll<
    K1 extends Key<P>,
    K2 extends Key<P>,
    K3 extends Key<P>,
    K4 extends Key<P>,
    K5 extends Key<P>,
    K6 extends Key<P>
  >(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>],
    path3: [K3, ...Args<P, K3>],
    path4: [K4, ...Args<P, K4>],
    path5: [K5, ...Args<P, K5>],
    path6: [K6, ...Args<P, K6>]
  ): [Ret<P, K1>, Ret<P, K2>, Ret<P, K3>, Ret<P, K4>, Ret<P, K5>, Ret<P, K6>];
  useAll<
    K1 extends Key<P>,
    K2 extends Key<P>,
    K3 extends Key<P>,
    K4 extends Key<P>,
    K5 extends Key<P>,
    K6 extends Key<P>,
    K7 extends Key<P>
  >(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>],
    path3: [K3, ...Args<P, K3>],
    path4: [K4, ...Args<P, K4>],
    path5: [K5, ...Args<P, K5>],
    path6: [K6, ...Args<P, K6>],
    path7: [K7, ...Args<P, K7>]
  ): [
    Ret<P, K1>,
    Ret<P, K2>,
    Ret<P, K3>,
    Ret<P, K4>,
    Ret<P, K5>,
    Ret<P, K6>,
    Ret<P, K7>
  ];
  useAll<
    K1 extends Key<P>,
    K2 extends Key<P>,
    K3 extends Key<P>,
    K4 extends Key<P>,
    K5 extends Key<P>,
    K6 extends Key<P>,
    K7 extends Key<P>,
    K8 extends Key<P>
  >(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>],
    path3: [K3, ...Args<P, K3>],
    path4: [K4, ...Args<P, K4>],
    path5: [K5, ...Args<P, K5>],
    path6: [K6, ...Args<P, K6>],
    path7: [K7, ...Args<P, K7>],
    path8: [K8, ...Args<P, K8>]
  ): [
    Ret<P, K1>,
    Ret<P, K2>,
    Ret<P, K3>,
    Ret<P, K4>,
    Ret<P, K5>,
    Ret<P, K6>,
    Ret<P, K7>,
    Ret<P, K8>
  ];
  useAll<
    K1 extends Key<P>,
    K2 extends Key<P>,
    K3 extends Key<P>,
    K4 extends Key<P>,
    K5 extends Key<P>,
    K6 extends Key<P>,
    K7 extends Key<P>,
    K8 extends Key<P>,
    K9 extends Key<P>
  >(
    path1: [K1, ...Args<P, K1>],
    path2: [K2, ...Args<P, K2>],
    path3: [K3, ...Args<P, K3>],
    path4: [K4, ...Args<P, K4>],
    path5: [K5, ...Args<P, K5>],
    path6: [K6, ...Args<P, K6>],
    path7: [K7, ...Args<P, K7>],
    path8: [K8, ...Args<P, K8>],
    path9: [K9, ...Args<P, K9>]
  ): [
    Ret<P, K1>,
    Ret<P, K2>,
    Ret<P, K3>,
    Ret<P, K4>,
    Ret<P, K5>,
    Ret<P, K6>,
    Ret<P, K7>,
    Ret<P, K8>,
    Ret<P, K9>
  ];
  useAll<A extends AllKey<P>>(...paths: any[]) {
    const bundles: Bundle<P>[] = paths;

    // Add path to list of listened to paths.
    let stale = false;
    const [state, setState] = useState(0);
    const versions = bundles.map((args) => this.resources.version(...args));
    useEffect(() => {
      const cbs = bundles.map((path, i) => () => {
        const newVersion = this.resources.version(...path);
        if (!stale && versions[i] < newVersion) {
          stale = true;
          setState(state + 1);
        }
      });
      bundles.forEach((args, i) => this.emitter.on(this.key(args), cbs[i]));
      reactEmitterListeners.value += bundles.length;
      return () => {
        bundles.forEach((args, i) =>
          this.emitter.removeListener(this.key(args), cbs[i])
        );
        reactEmitterListeners.value -= bundles.length;
      };
    });

    return paths.map((path: [Key<P>, ...Args<P, Key<P>>]) =>
      this.resources.get(...path)
    ) as AllRet<P, A>;
  }

  version<K extends Key<P>>(path: K, ...args: [...Args<P, K>]) {
    return this.resources.version(path, ...args);
  }

  use<K extends Key<P>>(path: K, ...args: [...Args<P, K>]) {
    return this.maybeUse(true, path, ...args) as Ret<P, K>;
  }

  maybeUse<K extends Key<P>>(cond: boolean, path: K, ...args: [...Args<P, K>]) {
    // Add path to list of listened to paths.
    const [version, setVersion] = useState(
      this.resources.version(path, ...args)
    );
    useEffect(() => {
      if (!cond) {
        return;
      }

      const cb = () => {
        const newVersion = this.resources.version(path, ...args);
        if (version < newVersion) {
          setVersion(newVersion);
        }
      };
      this.emitter.addListener(this.key([path, ...args]), cb);
      reactEmitterListeners.value += 1;
      return () => {
        this.emitter.removeListener(this.key([path, ...args]), cb);
        reactEmitterListeners.value -= 1;
      };
    }, [cond, path, ...args]);
    return cond ? this.resources.get(path, ...args) : undefined;
  }

  useSubset<K extends Key<P>, Q>(
    extractor: (a: Ret<P, K>) => Q,
    path: K,
    ...args: [...Args<P, K>]
  ) {
    const [version, setVersion] = useState(
      this.resources.version(path, ...args)
    );
    const lastRef = useRef(extractor(this.resources.get(path, ...args)));
    useEffect(() => {
      const cb = () => {
        const newVersion = this.resources.version(path, ...args);
        const newOne = extractor(this.resources.get(path, ...args));

        if (version < newVersion && !isEqual(newOne, lastRef.current)) {
          setVersion(newVersion);
          lastRef.current = newOne;
        }
      };
      this.emitter.addListener(this.key([path, ...args]), cb);
      reactEmitterListeners.value += 1;
      return () => {
        this.emitter.removeListener(this.key([path, ...args]), cb);
        reactEmitterListeners.value -= 1;
      };
    }, [path, ...args]);
    return lastRef.current;
  }

  useResolved<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>]
  ): Awaited<Ret<P, K>> | undefined {
    const promise = this.use(path, ...args);
    const dispatchRef = useRef<number>(0);
    const [val, setVal] = useState<Awaited<typeof promise> | undefined>(
      undefined
    );
    useEffectAsync(async () => {
      if (isPromise(promise)) {
        const dispatchNumber = dispatchRef.current + 1;
        const resolved = await (promise as Promise<Awaited<Ret<P, K>>>);
        if (dispatchRef.current < dispatchNumber) {
          setVal(resolved);
          dispatchRef.current = dispatchNumber;
        }
      } else {
        setVal(promise);
      }
    }, [this.version(path, ...args)]);

    return val;
  }

  get<K extends Key<P>>(path: K, ...args: [...Args<P, K>]) {
    return this.resources.get(path, ...args);
  }

  with<K extends Key<P>, R>(
    path: string,
    args: [...Args<P, K>],
    fn: (val: Resolve<Ret<P, K>>) => R
  ) {
    return this.resources.with<Ret<P, K>, R>(path, args, fn);
  }

  invalidate<K extends Key<P>>(path: K, ...args: [...Args<P, K>]): void {
    this.resources.invalidate(path, ...args);
  }

  set<K extends Key<P>>(path: K, ...args: [...Args<P, K>, Ret<P, K>]): void {
    this.resources.set(path, ...args);
  }

  update<K extends Key<P>>(
    path: K,
    ...args: [...Args<P, K>, (val: Ret<P, K>) => void]
  ): void {
    this.resources.update(path, ...args);
  }
}
