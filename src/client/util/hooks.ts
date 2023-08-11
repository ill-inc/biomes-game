import { log } from "@/shared/logging";
import { isEqual } from "lodash";
import type { DependencyList } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export function useMountedRef() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  });

  return isMounted;
}

export function useEffectAsync(
  func: () => Promise<void>,
  deps?: DependencyList
) {
  return useEffect(() => {
    void func();
  }, deps);
}

export function useEffectAsyncFetcher<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  setData: (value: T) => void,
  deps?: DependencyList
) {
  return useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          void setData(value);
        }
      })
      .catch((error) =>
        log.error("Error in async data fetcher", {
          error,
        })
      );
    return () => controller.abort();
  }, deps);
}

export function useAsyncInitialDataFetch<T>(
  fetcher: () => Promise<T>,
  setError?: (error: any) => any,
  deps?: DependencyList
): {
  loading: boolean;
  data: T | undefined;
} {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | undefined>(undefined);
  useEffectAsync(async () => {
    setLoading(true);
    try {
      setData(await fetcher());
    } catch (error: any) {
      if (setError) {
        setError(error);
      } else {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, deps ?? []);

  return {
    data,
    loading,
  };
}

export function useStateArray<T>(arr: T[]) {
  const [ret, setRet] = useState<T[]>(arr);

  const setIndex = useCallback((idx: number, val: T) => {
    setRet((oldRet) => {
      const newContents = [...oldRet];
      newContents[idx] = val;
      return newContents;
    });
  }, []);

  return [ret, setIndex, setRet] as const;
}

export function useStateWithTimeRevert<T>(
  timeout: number,
  value?: T,
  onRevert?: () => any
) {
  const [ret, setRet] = useState<T | undefined>(value);
  const reverterRef = useRef<ReturnType<typeof setTimeout>>();

  const newSetRet = (newVal: T | undefined, revertCb?: () => any) => {
    setRet(newVal);
    if (reverterRef.current) {
      clearTimeout(reverterRef.current);
    }

    reverterRef.current = setTimeout(() => {
      setRet(undefined);
      onRevert?.();
      revertCb?.();
    }, timeout);
  };

  return [ret, newSetRet] as const;
}

export function useAwaited<T>(
  promise: Promise<T>,
  onSuccess?: (value: T) => void,
  onError?: (error: any) => void,
  deps?: DependencyList
): T | undefined {
  const [ret, setRet] = useState<T | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const value = await promise;
        setRet(value);
        onSuccess?.(value);
      } catch (error: any) {
        onError?.(error);
        if (mounted) {
          setRet(undefined);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, deps || []);
  return ret;
}

export function useShowingTemporaryURL(
  url: string | undefined,
  deps: DependencyList = []
) {
  useEffect(() => {
    if (url === undefined) {
      return;
    }
    const nonce = Math.random();
    history.pushState({ nonce }, "", url);
    return () => {
      if (history.state?.nonce === nonce) {
        history.back();
      }
    };
  }, [url, ...deps]);
}

export function useInvalidate() {
  const [_version, setVersion] = useState(0);
  const invalidator = useCallback(() => {
    setVersion(Math.random());
  }, []);
  return invalidator;
}

export function useStateDeepEqual<V>(initial: V) {
  const [val, trueSetVal] = useState(initial);

  return [
    val,
    (newVal: V) => {
      trueSetVal((oldVal) => {
        if (isEqual(oldVal, newVal)) {
          return oldVal;
        }

        return newVal;
      });
    },
  ] as const;
}

export function useWithUnseenEmptyTransition<V>(
  value: V,
  isEmpty: boolean,
  maxUnseenEmptyTimeMs = 3000
) {
  const [val, setVal] = useState(() => value);
  const emptyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (emptyTimeoutRef.current) {
        clearTimeout(emptyTimeoutRef.current);
      }
    };
  }, []);

  if (isEmpty && !emptyTimeoutRef.current) {
    emptyTimeoutRef.current = setTimeout(() => {
      setVal(value);
    }, maxUnseenEmptyTimeMs);
  } else if (!isEmpty) {
    if (emptyTimeoutRef.current) {
      clearTimeout(emptyTimeoutRef.current);
      emptyTimeoutRef.current = undefined;
    }

    if (value !== val) {
      setVal(value);
    }
  }

  return val;
}

export function useEffectWithDebounce(
  {
    debounceMs,
    shouldTrigger,
    effect,
  }: {
    debounceMs: number;
    shouldTrigger?: () => boolean;
    effect: (signal: AbortSignal) => unknown;
  },
  deps: DependencyList
) {
  useEffect(() => {
    if (shouldTrigger && !shouldTrigger()) {
      return;
    }
    const controller = new AbortController();
    const done = () => clearTimeout(timeout);
    controller.signal.addEventListener("abort", done, {
      once: true,
    });

    const timeout = setTimeout(() => {
      controller.signal.removeEventListener("abort", done);
      if (controller.signal.aborted) {
        return;
      }
      effect(controller.signal);
    }, debounceMs);
    return () => controller.abort();
  }, deps);
}

export function useTimeout(
  callback: (args: void) => void,
  ms: number,
  deps: DependencyList
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(callback, ms);
  }, deps);
}
