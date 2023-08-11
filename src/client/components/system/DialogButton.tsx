import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { motion } from "framer-motion";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import React from "react";

export type DialogButtonType =
  | "normal"
  | "destructive"
  | "primary"
  | "special"
  | "normal-filled";
export type DialogButtonSize =
  | "xl"
  | "large"
  | "marge"
  | "medium"
  | "small"
  | "xsmall";

function dialogButtonClassName(
  disabled?: boolean,
  type?: DialogButtonType,
  size?: DialogButtonSize,
  highlighted?: boolean,
  extraClassNames?: string
) {
  let className = "button dialog-button";
  if (disabled) {
    className += " disabled";
  }
  if (highlighted) {
    className += " down";
  }
  if (
    type === "destructive" ||
    type === "primary" ||
    type == "special" ||
    type == "normal-filled"
  ) {
    className += ` ${type}`;
  }
  if (size) {
    className += ` ${size}`;
  }
  if (extraClassNames) {
    className += " " + extraClassNames;
  }

  return className;
}

export interface DialogAction {
  name: string;
  onClick?: () => any;
  disabled?: boolean;
  badgeCount?: number;
}

export interface DialogButtonProps {
  onClick?: () => any;
  disabled?: boolean;
  highlighted?: boolean;
  extraClassNames?: string;
  type?: DialogButtonType;
  size?: DialogButtonSize;
  badgeCount?: number;
  progress?: number;
  dontPreventDefault?: boolean;
  glow?: boolean;
  name?: string;
}

export const DialogButtons: React.FunctionComponent<{
  buttons: DialogButtonProps[];
}> = ({ buttons }) => {
  return (
    <>
      {buttons.map((e, i) => (
        <DialogButton {...e} key={e.name ?? String(i)} />
      ))}
    </>
  );
};

export const DialogButton: React.FunctionComponent<
  PropsWithChildren<DialogButtonProps>
> = ({
  badgeCount,
  progress,
  onClick,
  disabled,
  type,
  size = "medium",
  dontPreventDefault,
  children,
  highlighted,
  extraClassNames,
  name,
  glow,
}) => {
  const context = useClientContext();
  return (
    // We purposely don't pass through 'disabled' here, otherwise mouse events won't fire
    <button
      className={dialogButtonClassName(
        disabled,
        type,
        size,
        highlighted,
        extraClassNames
      )}
      type="button"
      onClick={(e) => {
        if (!disabled) {
          if (!dontPreventDefault) {
            e.preventDefault();
            e.stopPropagation();
          }
          context?.audioManager?.playSound("button_click");
          onClick?.();
        }
      }}
    >
      {glow ? (
        <motion.div
          className="button-progress"
          style={{ width: "100%" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ repeat: Infinity, repeatType: "mirror", duration: 1 }}
        />
      ) : undefined}
      {progress ? (
        <div
          className="button-progress"
          style={{ width: `${progress * 100}%` }}
        />
      ) : undefined}
      {badgeCount && <div className="circle-badge">{badgeCount}</div>}
      {name}
      {children}
    </button>
  );
};

export const DialogButtonLink: React.FunctionComponent<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    disabled?: boolean;
    type?: DialogButtonType;
    size?: DialogButtonSize;
    extraClassNames?: string;
  }
> = ({ disabled, type, size = "medium", extraClassNames, ...props }) => {
  const href = props.href || "_blank";
  return (
    <a
      {...props}
      href={href}
      className={`${dialogButtonClassName(
        disabled,
        type,
        size,
        false,
        extraClassNames
      )} inline-block`}
    />
  );
};
