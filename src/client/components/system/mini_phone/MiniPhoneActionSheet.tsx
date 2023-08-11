import type { PropsWithChildren } from "react";
import React from "react";

export const MiniPhoneActionSheetActions: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <div className="dialog-button-group">{children}</div>;
};
