// To reduce deps, copy this here
function isPromise<T, S>(obj: PromiseLike<T> | S): obj is PromiseLike<T> {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof (obj as any).then === "function"
  );
}

export function retargetableProxy<T>(base: T) {
  const wrapper = {
    obj: base,
  };
  const proxy = new Proxy(wrapper, {
    get: function (target, name) {
      const value = (target.obj as any)[name];
      return typeof value === "function" ? value.bind(target.obj) : value;
    },
  });

  return [
    proxy as T,
    (newItem: T) => {
      wrapper.obj = newItem;
    },
    wrapper,
  ] as const;
}

export function cleanupRetargetableProxy<
  T extends {
    [K in M]: () => unknown;
  },
  M extends keyof T
>(base: T, cleanup: M) {
  const [ret, setRet, wrapper] = retargetableProxy(base);
  return [
    ret,
    (newVal: T) => {
      wrapper.obj[cleanup]();
      setRet(newVal);
    },
  ] as const;
}

export function hotHandoffRetargetableProxy<
  T extends {
    [K in M]: (oldVal: T) => unknown;
  },
  M extends keyof T
>(base: T, hotHandoff: M) {
  const [ret, setRet, wrapper] = retargetableProxy(base);
  return [
    ret,
    (newVal: T) => {
      const v = newVal[hotHandoff](wrapper.obj);
      if (isPromise(v)) {
        void v.then(() => {
          setRet(newVal);
        });
      } else {
        setRet(newVal);
      }
    },
  ] as const;
}
