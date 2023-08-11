import type { ScreenStack } from "@/client/components/system/mini_phone/ScreenStack";
import {
  maybeUseExistingScreenStackContext,
  useExistingScreenStackContext,
  useNewScreenStack,
} from "@/client/components/system/mini_phone/ScreenStack";
import type { ReactChild } from "react";
import React from "react";

export type MiniPhoneContextType<T> = ScreenStack<T>;

export const useNewMiniPhoneContext = <PayloadT,>(
  onClose: () => any,
  initialStack?: PayloadT[] | (() => PayloadT[])
): MiniPhoneContextType<PayloadT> => useNewScreenStack(onClose, initialStack);

export const maybeUseExistingMiniPhoneContext = <PayloadT,>() =>
  maybeUseExistingScreenStackContext(
    MiniPhoneContext as React.Context<unknown>
  ) as MiniPhoneContextType<PayloadT>;

export const useExistingMiniPhoneContext = <PayloadT,>() =>
  useExistingScreenStackContext(
    MiniPhoneContext as React.Context<unknown>
  ) as MiniPhoneContextType<PayloadT>;

export const MiniPhoneContext = React.createContext(
  {} as MiniPhoneContextType<unknown>
);

export type MiniPhoneProps<PayloadT> = {
  renderPayload: (payload: PayloadT) => ReactChild;
  displayType: string;
  existingContext?: MiniPhoneContextType<PayloadT>;
  onClose: () => unknown;
};
