import type { ScreenStack } from "@/client/components/system/mini_phone/ScreenStack";
import {
  maybeUseExistingScreenStackContext,
  useExistingScreenStackContext,
  useNewScreenStack,
} from "@/client/components/system/mini_phone/ScreenStack";
import type { ReactNode } from "react";
import React, { useEffect } from "react";

import type { MiniPhoneContextType } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { PaneSlideover } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { last, take } from "lodash";
import type { PropsWithChildren } from "react";
import { useLayoutEffect, useState } from "react";

export type PaneSlideoverStack<T> = ScreenStack<T>;

export const useNewPaneSlideoverStack = <PayloadT,>(
  initialStack?: PayloadT[] | (() => PayloadT[])
): PaneSlideoverStack<PayloadT> => useNewScreenStack(() => {}, initialStack);

export const maybeUseExistingPaneSlideoverStack = <PayloadT,>() =>
  maybeUseExistingScreenStackContext(
    PaneSlideoverStackContext as React.Context<unknown>
  ) as PaneSlideoverStack<PayloadT>;

export function useExistingPaneSlideoverStackContext<PayloadT>() {
  return useExistingScreenStackContext(
    PaneSlideoverStackContext as React.Context<unknown>
  ) as PaneSlideoverStack<PayloadT>;
}

export const PaneSlideoverStackContext = React.createContext(
  {} as PaneSlideoverStack<unknown>
);

export type PaneSlideoverStackProps<PayloadT> = {
  renderPayload: (payload: PayloadT) => ReactNode;
  existingContext?: PaneSlideoverStack<PayloadT>;
};

export const PaneSlideoverStack = <PayloadT,>({
  renderPayload,
  existingContext,
  children,
}: PropsWithChildren<PaneSlideoverStackProps<PayloadT>>) => {
  const context = existingContext ?? useNewPaneSlideoverStack<PayloadT>();
  const current = last(context.screenStack);

  const [animationState, setAnimationState] = useState<
    "push" | "pop" | undefined
  >();

  const animationTime = 200;

  useEffect(() => {
    context.close = () => {
      setAnimationState("pop");
      setTimeout(() => {
        setAnimationState(undefined);
        context.setDesiredAction(undefined);
        context.setScreenStack([]);
      }, animationTime);
    };
  }, []);

  useLayoutEffect(() => {
    if (context.desiredAction === "pop") {
      setAnimationState("pop");
      setTimeout(() => {
        setAnimationState(undefined);
        context.setDesiredAction(undefined);
        context.setScreenStack([
          ...take(context.screenStack, context.screenStack.length - 1),
        ]);
      }, animationTime);
    } else if (context.desiredAction === "push") {
      setAnimationState("push");
      setTimeout(() => {
        setAnimationState(undefined);
        context.setDesiredAction(undefined);
      }, animationTime);
    }
  }, [context.desiredAction]);

  if (!current) {
    return (
      <PaneSlideoverStackContext.Provider
        value={context as MiniPhoneContextType<unknown>}
      >
        {children}
      </PaneSlideoverStackContext.Provider>
    );
  }

  return (
    <PaneSlideoverStackContext.Provider
      value={context as MiniPhoneContextType<unknown>}
    >
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        context.screenStack.map((payload, i) => {
          return (
            <PaneSlideover
              showing={
                i <= context.screenStack.length - 1 &&
                !(
                  i === context.screenStack.length - 1 &&
                  animationState === "pop"
                )
              }
              key={`screen-wrap-${i}`}
            >
              {renderPayload(payload)}
            </PaneSlideover>
          );
        })
      }
      {children}
    </PaneSlideoverStackContext.Provider>
  );
};
