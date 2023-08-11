import { Img } from "@/client/components/system/Img";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import type { PropsWithChildren, ReactChild, ReactElement } from "react";
import React from "react";
import arrowLeftIcon from "/public/hud/icon-16-chevron-left.png";
import xIcon from "/public/hud/icon-16-x.png";

export const MiniPhoneSplitPaneScreenTitle: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneSplitPaneScreenLeftItem: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneSplitPaneScreenLeftPane: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneSplitPaneScreenRightPane: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneSplitPaneScreenRightItem: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneSplitPaneScreenMoreMenu: React.FunctionComponent<{
  showing: boolean;
  setShowing: (showing: boolean) => any;
  items: MoreMenuItem[];
}> = ({ items, showing, setShowing }) => {
  return (
    <MoreMenu
      items={items}
      extraClassNames={"mini-phone-more"}
      anchor={"left"}
      showing={showing}
      setShowing={setShowing}
    />
  );
};

export const MiniPhoneSplitPaneScreen: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const context = useExistingMiniPhoneContext();
  let titleContent: ReactChild | undefined;
  let leftBarContent: ReactChild | undefined;
  let rightBarContent: ReactChild | undefined;
  let leftPaneContent: ReactChild | undefined;
  let rightPaneContent: ReactChild | undefined;
  const extraChildren: ReactChild[] = [];

  React.Children.forEach(children, (child) => {
    switch ((child as ReactElement)?.type) {
      case MiniPhoneSplitPaneScreenLeftItem:
        if (leftBarContent !== undefined) {
          throw new Error("Duplicate left item in react miniphone");
        }
        leftBarContent = child as ReactChild;
        break;
      case MiniPhoneSplitPaneScreenRightItem:
        if (rightBarContent !== undefined) {
          throw new Error("Duplicate right item in react miniphone");
        }
        rightBarContent = child as ReactChild;
        break;
      case MiniPhoneSplitPaneScreenTitle:
        if (titleContent !== undefined) {
          throw new Error("Duplicate title item in react miniphone");
        }
        titleContent = child as ReactChild;
        break;

      case MiniPhoneSplitPaneScreenLeftPane:
        if (leftPaneContent !== undefined) {
          throw new Error("Duplicate screen item in react miniphone");
        }
        leftPaneContent = child as ReactChild;
        break;

      case MiniPhoneSplitPaneScreenRightPane:
        if (rightPaneContent !== undefined) {
          throw new Error("Duplicate screen item in react miniphone");
        }
        rightPaneContent = child as ReactChild;
        break;

      default:
        extraChildren.push(child as ReactChild);
        break;
    }
  });

  if (!leftBarContent) {
    if (context.screenStack.length > 1) {
      leftBarContent = (
        <div className="toolbar-icon link" onClick={context.popNavigationStack}>
          <Img src={arrowLeftIcon.src} alt="" />
        </div>
      );
    } else {
      leftBarContent = (
        <div
          className="toolbar-icon link"
          id="close"
          onClick={() => {
            context.close();
          }}
        >
          <Img src={xIcon.src} alt="" />
        </div>
      );
    }
  }

  if (!rightBarContent) {
    rightBarContent = <div className="toolbar-icon"></div>;
  }

  if (!titleContent) {
    titleContent = <span> Screen </span>;
  }

  if (!leftPaneContent) {
    throw new Error(
      "No left pane element found for miniphone split pane screen"
    );
  }

  if (!rightPaneContent) {
    throw new Error(
      "No right pane element found for miniphone split pane screen"
    );
  }

  return (
    <div className="split-pane-screen">
      {extraChildren}
      <div className="left-pane">
        <div className="title-bar">
          {leftBarContent}
          <div className="title font-large">{titleContent}</div>
          {rightBarContent}
        </div>
        <div className="divider" />
        <div className="left-pane-content">{leftPaneContent}</div>
      </div>
      <div className="right-pane">
        <div className="right-pane-content">{rightPaneContent}</div>
      </div>
    </div>
  );
};

export type MiniPhoneSplitPaneScreenSpec<PayloadT> = PayloadT;
