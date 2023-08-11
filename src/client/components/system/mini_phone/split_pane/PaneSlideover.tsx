import type { PaneLayoutProps } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import type { ScreenTitleBarStyle } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import {
  LeftBarX,
  ScreenTitleBar,
} from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import type { PropsWithChildren } from "react";

import { LeftBarItem } from "@/client/components/system/mini_phone/split_pane/LeftBarItem";
import { maybeUseExistingPaneSlideoverStack } from "@/client/components/system/mini_phone/split_pane/PaneSlideoverStack";
import { AnimatePresence, motion } from "framer-motion";

export const PaneSlideoverTitleBar: React.FunctionComponent<
  PropsWithChildren<{
    title?: string;
    titleBarStyle?: ScreenTitleBarStyle;
    onClose?: () => unknown;
    divider?: boolean;
  }>
> = ({
  children,
  title,
  titleBarStyle = "default",
  onClose,
  divider = true,
}) => {
  const slideoverStack = maybeUseExistingPaneSlideoverStack();
  onClose ??= () => {
    slideoverStack?.popNavigationStack();
  };
  return (
    <>
      <ScreenTitleBar
        title={title}
        divider={divider}
        titleBarStyle={titleBarStyle}
      >
        <LeftBarItem>
          <LeftBarX onClick={onClose} />
        </LeftBarItem>
        {children}
      </ScreenTitleBar>
    </>
  );
};

export type PaneSlideoverSize =
  | "full"
  | "medium"
  | "action-sheet"
  | "auto-height";

export const PaneSlideover: React.FunctionComponent<
  PropsWithChildren<
    {
      size?: PaneSlideoverSize;
      showing: boolean;
      onClose?: () => unknown;
    } & PaneLayoutProps
  >
> = ({ children, size = "full", showing, onClose }) => {
  const stiffness = size == "full" ? 150 : 200;

  return (
    <AnimatePresence>
      {showing && (
        <>
          <motion.div
            className="slideover-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              mass: 0.5,
              damping: 20,
              stiffness: stiffness,
            }}
            className={`slideover biomes-box ${size}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
