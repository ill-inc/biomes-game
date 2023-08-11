export type Disposable<T> = T & { dispose: () => void };

export function isDisposable<T>(obj: T): obj is Disposable<T> {
  return typeof (obj as any)?.dispose === "function";
}

export function makeDisposable<T>(obj: T, fn: () => void) {
  const ret = obj as Disposable<T>;
  ret.dispose = fn;
  return ret;
}
