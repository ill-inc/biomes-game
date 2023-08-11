import { Img } from "@/client/components/system/Img";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import type { PropsWithChildren, ReactChild, ReactElement } from "react";
import React from "react";
import arrowLeftIcon from "/public/hud/icon-16-chevron-left.png";
import xIcon from "/public/hud/icon-16-x.png";

export const MiniPhoneScreenTitle: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneScreenLeftItem: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneScreenContent: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneScreenRightItem: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const MiniPhoneScreenMoreMenu: React.FunctionComponent<{
  showing: boolean;
  items: MoreMenuItem[];
}> = ({ items, showing }) => {
  return (
    <MoreMenu
      items={items}
      extraClassNames={"mini-phone-more"}
      anchor={"left"}
      showing={showing}
    />
  );
};

export const MiniPhoneScreen: React.FunctionComponent<
  PropsWithChildren<{ divider?: boolean }>
> = ({ divider, children }) => {
  const context = useExistingMiniPhoneContext();
  let titleContent: ReactChild | undefined;
  let leftBarContent: ReactChild | undefined;
  let rightBarContent: ReactChild | undefined;
  let screenContent: ReactChild | undefined;
  const extraChildren: ReactChild[] = [];

  React.Children.forEach(children, (child) => {
    switch ((child as ReactElement)?.type) {
      case MiniPhoneScreenLeftItem:
        if (leftBarContent !== undefined) {
          throw new Error("Duplicate left item in react miniphone");
        }
        leftBarContent = child as ReactChild;
        break;
      case MiniPhoneScreenRightItem:
        if (rightBarContent !== undefined) {
          throw new Error("Duplicate right item in react miniphone");
        }
        rightBarContent = child as ReactChild;
        break;
      case MiniPhoneScreenTitle:
        if (titleContent !== undefined) {
          throw new Error("Duplicate title item in react miniphone");
        }
        titleContent = child as ReactChild;
        break;

      case MiniPhoneScreenContent:
        if (screenContent !== undefined) {
          throw new Error("Duplicate screen item in react miniphone");
        }
        screenContent = child as ReactChild;
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

  if (!screenContent) {
    throw new Error("No screen content element found for MiniPhone");
  }

  return (
    <>
      {extraChildren}
      <div className={`title-bar ${!divider ? "no-border" : ""}`}>
        {leftBarContent}
        <div className="title font-large">{titleContent}</div>
        {rightBarContent}
      </div>
      <div className="content">{screenContent}</div>
    </>
  );
};

export type MiniPhoneScreenSpec<PayloadT> = PayloadT;
