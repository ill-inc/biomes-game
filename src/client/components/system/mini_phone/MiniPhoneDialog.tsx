import type { PropsWithChildren } from "react";
import React from "react";
import { useBottomScrollListener } from "react-bottom-scroll-listener";

export const MiniPhoneDialog: React.FunctionComponent<
  PropsWithChildren<{
    extraClassName?: string;
  }>
> = ({ extraClassName, children }) => {
  return (
    <div className={`mini-phone-dialog dialog ${extraClassName ?? ""}`}>
      {children}
    </div>
  );
};

export const MiniPhoneDialogContent: React.FunctionComponent<
  PropsWithChildren<{
    style?: "default" | "pin-top" | "edit-appearance";
    extraClassName?: string;
    onBottom?: () => any;
  }>
> = ({ children, style = "default", extraClassName, onBottom }) => {
  const scrollRef = useBottomScrollListener<HTMLDivElement>(() => {
    onBottom?.();
  });
  return (
    <div
      className={`mini-phone-dialog-content ${style} ${extraClassName}`}
      ref={scrollRef}
    >
      {children}
    </div>
  );
};

export const MiniPhoneDialogButtons: React.FunctionComponent<
  PropsWithChildren<{
    hideDivider?: boolean;
    extraClassName?: string;
  }>
> = ({ children, extraClassName, hideDivider = false }) => {
  return (
    <div
      className={`dialog-button-group mini-phone-dialog-buttons ${extraClassName}`}
    >
      {!hideDivider && <div className="divider"></div>}
      <div className="bottom-content">{children}</div>
    </div>
  );
};
