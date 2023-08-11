import { Img } from "@/client/components/system/Img";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import React from "react";
import hamburgerIcon from "/public/hud/icon-16-hamburger.png";
import moreIcon from "/public/hud/icon-16-more.png";
import closeIcon from "/public/hud/icon-16-x.png";

export const MiniPhoneToolbarItem: React.FunctionComponent<{
  onClick?: (e: React.MouseEvent) => any;
  onMouseOver?: () => any;
  src: string;
  tooltip?: string;
  badgeCount?: number;
  extraClassNames?: string;
}> = ({ onClick, onMouseOver, src, tooltip, badgeCount, extraClassNames }) => {
  return (
    <Tooltipped tooltip={tooltip}>
      <div
        className={"toolbar-icon link " + (extraClassNames ?? "")}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onMouseOver={onMouseOver}
      >
        <Img src={src} alt="" />
        {badgeCount && badgeCount > 0 && (
          <div className="badge">{badgeCount}</div>
        )}
      </div>
    </Tooltipped>
  );
};

export const MiniPhoneHamburgerItem: React.FunctionComponent<{
  onClick?: () => any;
  onMouseOver?: () => any;
}> = ({ onClick, onMouseOver }) => {
  return (
    <MiniPhoneToolbarItem
      src={hamburgerIcon.src}
      onClick={onClick}
      onMouseOver={onMouseOver}
    />
  );
};

export const MiniPhoneMoreItem: React.FunctionComponent<{
  onClick?: (e: React.MouseEvent) => any;
  onMouseOver?: () => any;
}> = ({ onClick, onMouseOver }) => {
  return (
    <MiniPhoneToolbarItem
      src={moreIcon.src}
      onClick={onClick}
      onMouseOver={onMouseOver}
    />
  );
};

export const MiniPhoneCloseItem: React.FunctionComponent<{
  onClick?: () => any;
  onMouseOver?: () => any;
}> = ({ onClick, onMouseOver }) => {
  return (
    <MiniPhoneToolbarItem
      src={closeIcon.src}
      onClick={onClick}
      onMouseOver={onMouseOver}
    />
  );
};
