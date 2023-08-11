import type { PaneLayoutProps } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import type { PropsWithChildren } from "react";

export const LeftPane: React.FunctionComponent<
  PropsWithChildren<PaneLayoutProps>
> = ({ children, ...layoutProps }) => {
  return <PaneLayout {...layoutProps}>{children}</PaneLayout>;
};

// Version of left pane with no default layout
export const RawLeftPane: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  return <>{children}</>;
};
