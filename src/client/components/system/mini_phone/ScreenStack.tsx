import { ok } from "assert";
import React, { useCallback, useContext, useState } from "react";

export type Action = "push" | "pop";
export interface ScreenStack<PayloadT> {
  screenStack: PayloadT[];
  setScreenStack: (stack: PayloadT[]) => any;
  popNavigationStack: () => any;
  pushNavigationStack: (item: PayloadT) => any;
  close: () => any;
  desiredAction: Action | undefined;
  setDesiredAction: (action: Action | undefined) => any;
}

export const useNewScreenStack = <PayloadT,>(
  onClose: () => any,
  initialStack?: PayloadT[] | (() => PayloadT[])
) => {
  const [desiredAction, setDesiredAction] = useState<Action>();
  const [screenStack, setScreenStack] = useState<PayloadT[]>(
    initialStack ?? []
  );
  const popNavigationStack = useCallback(() => {
    setDesiredAction("pop");
  }, [screenStack]);

  const pushNavigationStack = useCallback(
    (item: PayloadT) => {
      setDesiredAction("push");
      setScreenStack([...screenStack, item]);
    },
    [screenStack]
  );

  return {
    screenStack,
    setScreenStack,
    popNavigationStack,
    pushNavigationStack,
    close: onClose,
    desiredAction,
    setDesiredAction,
  };
};

export const maybeUseExistingScreenStackContext = <PayloadT,>(
  contextType: React.Context<unknown> = ScreenStackContext
) => {
  const ret = useContext(contextType) as ScreenStack<PayloadT>;
  const trueRet = !ret?.screenStack ? undefined : ret;
  return trueRet;
};

export const useExistingScreenStackContext = <PayloadT,>(
  contextType: React.Context<unknown> = ScreenStackContext
) => {
  const ret = useContext(contextType) as ScreenStack<PayloadT>;
  ok(
    ret.screenStack !== undefined,
    "Tried to use an existing context for screen stack that wasn't initialized"
  );
  return ret;
};

export const ScreenStackContext = React.createContext({} as unknown);
