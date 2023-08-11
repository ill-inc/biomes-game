import type { PropsWithChildren } from "react";
import React from "react";

export type CKButtonStyle = "hud" | "default";

export const CKButton: React.FunctionComponent<
  PropsWithChildren<{
    onClick?: () => any;
    style?: CKButtonStyle;
    disabled?: boolean;
  }>
> = ({ onClick, disabled, style, children }) => {
  const extraClass = style && style !== "default" ? style : "";
  return (
    <button
      className={`ck-button ${extraClass}`}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
