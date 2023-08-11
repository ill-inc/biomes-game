import { MiniPhoneScreenTitle } from "@/client/components/system/mini_phone/MiniPhoneScreen";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import type { PaneSlideoverSize } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import {
  PaneSlideover,
  PaneSlideoverTitleBar,
} from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import type { PropsWithChildren } from "react";
import React from "react";

export const PaneActionSheet: React.FunctionComponent<
  PropsWithChildren<{
    showing: boolean;
    title?: string;
    rightBarItem?: JSX.Element;
    extraClassNames?: string;
    onClose?: () => unknown;
    size?: PaneSlideoverSize;
  }>
> = ({
  showing,
  title,
  rightBarItem,
  extraClassNames,
  size = "action-sheet",
  onClose,
  children,
}) => {
  return (
    <PaneSlideover
      showing={showing}
      size={size}
      extraClassName={extraClassNames}
      onClose={onClose}
    >
      <PaneLayout>
        <PaneSlideoverTitleBar onClose={onClose}>
          <BarTitle>
            <MiniPhoneScreenTitle>{title}</MiniPhoneScreenTitle>
          </BarTitle>
          {rightBarItem && <RightBarItem>{rightBarItem}</RightBarItem>}
        </PaneSlideoverTitleBar>
        {children}
      </PaneLayout>
    </PaneSlideover>
  );
};
