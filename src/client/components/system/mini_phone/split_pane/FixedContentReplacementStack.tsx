import type { ScreenStack } from "@/client/components/system/mini_phone/ScreenStack";
import {
  maybeUseExistingScreenStackContext,
  useExistingScreenStackContext,
  useNewScreenStack,
} from "@/client/components/system/mini_phone/ScreenStack";
import type { ReactNode } from "react";
import React from "react";

import type { MiniPhoneContextType } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { last, take } from "lodash";
import type { PropsWithChildren } from "react";
import { useLayoutEffect, useState } from "react";

export type FixedContentReplacementStack<T> = ScreenStack<T>;

export const useNewFixedContentReplacementStack = <PayloadT,>(
  onClose: () => unknown,
  initialStack?: PayloadT[] | (() => PayloadT[])
): FixedContentReplacementStack<PayloadT> =>
  useNewScreenStack(onClose, initialStack);

export const maybeUseExistingFixedContentReplacementStack = <PayloadT,>() =>
  maybeUseExistingScreenStackContext(
    FixedContentReplacementStackContext as React.Context<unknown>
  ) as FixedContentReplacementStack<PayloadT>;

export const useExistingFixedContentReplacementStackContext = <PayloadT,>() =>
  useExistingScreenStackContext(
    FixedContentReplacementStackContext as React.Context<unknown>
  ) as FixedContentReplacementStack<PayloadT>;

export const FixedContentReplacementStackContext = React.createContext(
  {} as FixedContentReplacementStack<unknown>
);

export type FixedContentReplacementStackProps<PayloadT> = {
  renderPayload: (payload: PayloadT) => ReactNode;
  existingContext?: FixedContentReplacementStack<PayloadT>;
};

export const FixedContentReplacementStack = <PayloadT,>({
  renderPayload,
  existingContext,
  children,
}: PropsWithChildren<FixedContentReplacementStackProps<PayloadT>>) => {
  const context =
    existingContext ?? useNewFixedContentReplacementStack<PayloadT>(() => {});
  const current = last(context.screenStack);

  const [animationState, setAnimationState] = useState<
    "push" | "pop" | undefined
  >();

  const animationTime = 200;

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
      <FixedContentReplacementStackContext.Provider
        value={context as MiniPhoneContextType<unknown>}
      >
        {children}
      </FixedContentReplacementStackContext.Provider>
    );
  }

  return (
    <FixedContentReplacementStackContext.Provider
      value={context as MiniPhoneContextType<unknown>}
    >
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        context.screenStack.map((payload, i) => {
          const showing =
            i === context.screenStack.length - 1 ||
            (i === context.screenStack.length - 1 && animationState === "pop");
          return (
            <div
              className={`fixed-content-replacement ${
                showing ? "showing" : "buried"
              }`}
              key={`screen-wrap-${i}`}
            >
              {renderPayload(payload)}
            </div>
          );
        })
      }
      {children}
    </FixedContentReplacementStackContext.Provider>
  );
};
