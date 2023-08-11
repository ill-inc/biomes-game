import type { PropsWithChildren } from "react";
import React from "react";

export type MiniPhoneFixedScreenStyle = "center";
export const MiniPhoneFixedScreen: React.FunctionComponent<
  PropsWithChildren<{
    extraClassName?: string;
    style?: MiniPhoneFixedScreenStyle;
  }>
> = ({ extraClassName, children, style }) => {
  return (
    <div className={`mini-phone-fixed-screen ${style} ${extraClassName ?? ""}`}>
      {children}
    </div>
  );
};
