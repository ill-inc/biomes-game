import { Img } from "@/client/components/system/Img";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { PropsWithChildren } from "react";
import React from "react";
import commentIcon from "/public/hud/icon-32-comment.png";
import heartFilledIcon from "/public/hud/icon-32-heart-filled.png";
import heartIcon from "/public/hud/icon-32-heart.png";

export type ActionButtonType = "like" | "comment";

function actionButtonClassName(type: ActionButtonType, disabled?: boolean) {
  let className = `action-button link ${type}-button`;
  if (disabled) {
    className += " disabled";
  }
  return className;
}

export const ActionButton: React.FunctionComponent<
  PropsWithChildren<{
    onClick?: () => any;
    type: ActionButtonType;
    tooltip?: string | JSX.Element;
    filled?: boolean;
    disabled?: boolean;
  }>
> = ({ onClick, filled, disabled, type, tooltip, children }) => {
  let imagePayload: JSX.Element | undefined;
  switch (type) {
    case "like":
      if (filled) {
        imagePayload = <Img className="heart" src={heartFilledIcon.src} />;
      } else {
        imagePayload = <Img className="heart" src={heartIcon.src} />;
      }
      break;

    case "comment":
      imagePayload = <Img className="comment" src={commentIcon.src} />;
      break;
  }

  return (
    <Tooltipped tooltip={tooltip}>
      <button
        className={actionButtonClassName(type, disabled)}
        onClick={(e) => {
          e.preventDefault();
          onClick?.();
        }}
        disabled={disabled}
      >
        {imagePayload}
        {children}
      </button>
    </Tooltipped>
  );
};
