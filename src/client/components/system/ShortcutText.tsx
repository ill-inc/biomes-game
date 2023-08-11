import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import type { KeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";
import React, { useEffect, useState } from "react";
import leftClickIcon from "/public/hud/icon-16-left-mouse.png";
import rightClickIcon from "/public/hud/icon-16-right-mouse.png";

export function getClickIcon(type: "primary" | "secondary") {
  const togglePrimaryClick = getTypedStorageItem(
    "settings.mouse.togglePrimaryClick"
  );
  let icon = "";
  switch (type) {
    case "primary":
      icon = togglePrimaryClick ? "right" : "left";
      break;
    case "secondary":
      icon = togglePrimaryClick ? "left" : "right";
      break;
  }
  return icon == "left" ? leftClickIcon.src : rightClickIcon.src;
}

export const ClickIcon: React.FunctionComponent<{
  type: "primary" | "secondary";
}> = ({ type }) => {
  const togglePrimaryClick = getTypedStorageItem(
    "settings.mouse.togglePrimaryClick"
  );
  let buttonSide = "";
  switch (type) {
    case "primary":
      buttonSide = togglePrimaryClick ? "Right" : "Left";
      break;
    case "secondary":
      buttonSide = togglePrimaryClick ? "Left" : "Right";
      break;
  }
  return <span className="yellow">{buttonSide} Click</span>;
};

export const ShortcutText: React.FunctionComponent<
  PropsWithChildren<{
    shortcut: string | JSX.Element;
    keyCode?: KeyCode;
    onKeyDown?: () => unknown;
    onShiftedKeyDown?: () => unknown;
    extraClassName?: string;
    progressPercent?: number;
    disabled?: boolean;
  }>
> = ({ ...props }) => {
  const [keydown, setKeydown] = useState(false);
  const { audioManager } = useClientContext();
  const pointerLockManager = usePointerLockManager();

  useEffect(() => {
    if (props.keyCode) {
      return cleanListener(document, {
        keydown: (e: KeyboardEvent) => {
          if (
            !pointerLockManager.allowHUDInput() ||
            e.code !== props.keyCode ||
            e.repeat ||
            props.disabled
          ) {
            return;
          }

          if (props.onShiftedKeyDown && e.shiftKey) {
            props.onShiftedKeyDown();
          } else {
            props.onKeyDown?.();
          }

          audioManager.playSound("button_click");
          setKeydown(true);
        },
        keyup: () => {
          setKeydown(false);
        },
      });
    }
  }, [props.keyCode, props.onKeyDown]);
  return (
    <span className={`key-hint ${props.disabled ? "disabled" : ""}`}>
      <motion.span
        className={`key ${props.extraClassName ?? ""}`}
        animate={{ scale: keydown ? 0.9 : 1 }}
      >
        {props.shortcut}
        {!!props.progressPercent && (
          <div
            className={`progress ${
              props.progressPercent >= 100 ? "complete" : ""
            }`}
            style={{ width: `${props.progressPercent}%` }}
          ></div>
        )}
      </motion.span>{" "}
      {props.children}
    </span>
  );
};
