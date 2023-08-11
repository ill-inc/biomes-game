import {
  LeftPane,
  RawLeftPane,
} from "@/client/components/system/mini_phone/split_pane/LeftPane";
import {
  RawRightPane,
  RightPane,
} from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import React from "react";

export const SplitPaneScreen: React.FunctionComponent<
  PropsWithChildren<{
    extraClassName?: string;
    leftPaneExtraClassName?: string;
    rightPaneExtraClassName?: string;
    onClick?: any;
  }>
> = ({
  children,
  extraClassName,
  leftPaneExtraClassName,
  rightPaneExtraClassName,
  onClick,
}) => {
  let titleBarContent: ReactNode | undefined;
  let leftPaneContent: ReactNode | undefined;
  let rightPaneContent: ReactNode | undefined;
  const extraChildren: ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    switch ((child as ReactElement)?.type) {
      case ScreenTitleBar:
        if (titleBarContent !== undefined) {
          throw new Error("Duplicate title item in react miniphone");
        }
        titleBarContent = child;
        break;

      case LeftPane:
      case RawLeftPane:
        if (leftPaneContent !== undefined) {
          throw new Error("Duplicate screen item in react miniphone");
        }
        leftPaneContent = child;
        break;

      case RightPane:
      case RawRightPane:
        if (rightPaneContent !== undefined) {
          throw new Error("Duplicate screen item in react miniphone");
        }
        rightPaneContent = child;
        break;

      default:
        extraChildren.push(child);
        break;
    }
  });

  if (!titleBarContent) {
    throw new Error(
      "No title bar element found for miniphone split pane screen"
    );
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
    <div
      className={`split-pane-screen ${extraClassName ?? ""}`}
      onClick={onClick}
    >
      {extraChildren}
      <div className={`left-pane ${leftPaneExtraClassName ?? ""}`}>
        {titleBarContent}
        <div className="left-pane-content">{leftPaneContent}</div>
      </div>
      <div className={`right-pane ${rightPaneExtraClassName ?? ""}`}>
        <div className="right-pane-content">{rightPaneContent}</div>
      </div>
    </div>
  );
};

export type SplitPaneScreenSpec<PayloadT> = PayloadT;
