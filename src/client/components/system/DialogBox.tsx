import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { PropsWithChildren, ReactChild, ReactElement } from "react";
import React, { useEffect } from "react";

export const DialogBoxTitle: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  return <>{children}</>;
};

export const DialogBoxContents: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <>{children}</>;
};

export const DialogBox: React.FunctionComponent<
  PropsWithChildren<{
    extraClassName?: string;
    showTitle?: boolean;
  }>
> = ({ children, extraClassName, showTitle }) => {
  const audioManager = useClientContext()?.audioManager;
  let titleContent: ReactChild | undefined;
  let screenContent: ReactChild | undefined;
  const extraChildren: ReactChild[] = [];

  React.Children.forEach(children, (child) => {
    switch ((child as ReactElement)?.type) {
      case DialogBoxTitle:
        if (titleContent !== undefined) {
          throw new Error("Duplicate title item in react miniphone");
        }
        titleContent = child as ReactChild;
        break;

      case DialogBoxContents:
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

  if (!screenContent) {
    throw new Error("No content element found for DialogBox");
  }

  if (!titleContent) {
    titleContent = <span> Screen </span>;
  }

  useEffect(() => {
    // audioManager may be null if this is an error dialog and we don't have
    // a client context available yet.
    if (audioManager) {
      audioManager.playSound("dialog_open");
      return () => {
        audioManager.playSound("dialog_close");
      };
    }
  }, []);

  return (
    <div className={`biomes-box dialog ${extraClassName ?? ""}`}>
      {extraChildren}
      {(showTitle === undefined || showTitle === true) && (
        <div className="title-bar">
          <div className="title font-large">{titleContent}</div>
        </div>
      )}
      <div className="dialog-contents">{screenContent}</div>
    </div>
  );
};
