import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneSlideoverTitleBar } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import React from "react";
import { useBottomScrollListener } from "react-bottom-scroll-listener";

export type PaneLayoutProps = {
  type?: "scroll" | "center" | "center_both";
  extraClassName?: string;
  hideScrollbar?: boolean;
  onBottom?: () => unknown;
};

export const PaneLayout: React.FunctionComponent<
  PropsWithChildren<PaneLayoutProps>
> = ({ type, children, extraClassName, hideScrollbar, onBottom }) => {
  const bottomContent: ReactNode[] = [];
  const extraChildren: ReactNode[] = [];
  const titleBarContent: ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    switch ((child as ReactElement)?.type) {
      case ScreenTitleBar:
      case PaneSlideoverTitleBar:
        titleBarContent.push(child);
        break;
      case PaneBottomDock:
        bottomContent.push(child);
        break;
      default:
        extraChildren.push(child);
        break;
    }
  });

  const ref = useBottomScrollListener<HTMLDivElement>(
    () => {
      onBottom?.();
    },
    {
      offset: 200,
    }
  );

  return (
    <div className={`pane-layout ${type ?? "scroll"} ${extraClassName ?? ""}`}>
      {titleBarContent}
      <div
        className={`content ${hideScrollbar ? "hide-scrollbar" : ""} `}
        ref={ref}
      >
        {extraChildren}
      </div>
      {bottomContent.length > 0 && (
        <div className="bottom">{bottomContent}</div>
      )}
    </div>
  );
};
