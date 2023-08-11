import { types } from "util";

//
// WARNING: DO NOT PUT ANYTHING IN HERE WITHOUT CAREFULLY REASONING ABOUT IT
//          IT CAN CAUSE A CIRCULAR DEP IN RELOADS
//

// Denormed so we can have more hot reload
type IfPromise<T, Yes, No> = T extends PromiseLike<infer _U> ? Yes : No;
export function ifPromiseThen<T, R>(
  value: T,
  thenFn: (value: Awaited<T>) => R
): IfPromise<T, Promise<R>, R> {
  if (types.isPromise(value)) {
    return (value as Promise<T>).then((resolved) =>
      thenFn(resolved as Awaited<T>)
    ) as IfPromise<T, Promise<R>, R>;
  } else {
    return thenFn(value as Awaited<T>) as IfPromise<T, Promise<R>, R>;
  }
}
export function clientContextHotAccept<T>(
  builder: () => Promise<T> | T,
  setNew: (newVal: T) => void
) {
  return () => {
    void ifPromiseThen(builder(), setNew);
  };
}
