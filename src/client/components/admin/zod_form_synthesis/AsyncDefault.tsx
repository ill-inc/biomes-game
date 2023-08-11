import type { AsyncDefaultContext } from "@/shared/zfs/async_default";
import { createAsyncDefaultContext } from "@/shared/zfs/async_default";
import type { PropsWithChildren } from "react";
import { createContext, useMemo } from "react";

export const AsyncDefaultReactContext = createContext<
  AsyncDefaultContext | undefined
>(undefined);

export const AsyncDefaultContextDefaultProvider: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const asyncDefaultContext = useMemo(createAsyncDefaultContext, []);

  return (
    <AsyncDefaultReactContext.Provider value={asyncDefaultContext}>
      {children}
    </AsyncDefaultReactContext.Provider>
  );
};
