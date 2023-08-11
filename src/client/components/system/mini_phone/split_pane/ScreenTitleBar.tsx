import { Img } from "@/client/components/system/Img";
import { maybeUseExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { LeftBarItem } from "@/client/components/system/mini_phone/split_pane/LeftBarItem";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import React from "react";
import backIcon from "/public/hud/icon-16-chevron-left.png";
import xIcon from "/public/hud/icon-16-x.png";

export const LeftBarX: React.FunctionComponent<{ onClick: () => unknown }> = ({
  onClick,
}) => {
  return (
    <div className="toolbar-icon link" onClick={onClick}>
      <Img src={xIcon.src} alt="" />
    </div>
  );
};

export const LeftBarBack: React.FunctionComponent<{
  onClick: () => unknown;
}> = ({ onClick }) => {
  return (
    <div className="toolbar-icon link" onClick={onClick}>
      <Img src={backIcon.src} alt="" />
    </div>
  );
};

export const LeftBarEmpty: React.FunctionComponent<{}> = ({}) => {
  return <div className="toolbar-icon" />;
};

export type ScreenTitleBarStyle = "default" | "unstyled";

export const ScreenTitleBar: React.FunctionComponent<
  PropsWithChildren<{
    title?: string;
    titleBarStyle?: ScreenTitleBarStyle;
    divider?: boolean;
    disableLeftBar?: boolean;
  }>
> = ({
  title,
  titleBarStyle = "default",
  divider = true,
  disableLeftBar,
  children,
}) => {
  const context = maybeUseExistingMiniPhoneContext();
  let titleContent: ReactNode | undefined = title;
  let leftBarContent: ReactNode | undefined;
  let rightBarContent: ReactNode | undefined;
  const extraChildren: ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    switch ((child as ReactElement)?.type) {
      case LeftBarItem:
        if (leftBarContent !== undefined) {
          throw new Error("Duplicate left item in react miniphone");
        }
        leftBarContent = child;
        break;
      case RightBarItem:
        if (rightBarContent !== undefined) {
          throw new Error("Duplicate right item in react miniphone");
        }
        rightBarContent = child;
        break;
      case BarTitle:
        if (titleContent !== undefined) {
          throw new Error("Duplicate title item in react miniphone");
        }
        titleContent = child;
        break;

      default:
        extraChildren.push(child);
        break;
    }
  });

  if (!leftBarContent) {
    if (disableLeftBar) {
      leftBarContent = <LeftBarEmpty />;
    } else if (context && context.screenStack.length > 1) {
      leftBarContent = <LeftBarBack onClick={context.popNavigationStack} />;
    } else {
      leftBarContent = (
        <LeftBarX
          onClick={() => {
            context?.close();
          }}
        />
      );
    }
  }

  if (!rightBarContent) {
    rightBarContent = <div className="toolbar-icon"></div>;
  }

  if (!titleContent) {
    titleContent = <span> Screen </span>;
  }

  return (
    <div className={`title-bar ${!divider ? "no-border" : ""}`}>
      {leftBarContent}
      {titleBarStyle == "unstyled" ? (
        <>{titleContent}</>
      ) : (
        <div className="title font-large">{titleContent}</div>
      )}

      {rightBarContent}
      {extraChildren}
    </div>
  );
};
