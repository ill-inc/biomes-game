import type { PaneLayoutProps } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import type { PropsWithChildren } from "react";

export const RightPane: React.FunctionComponent<
  PropsWithChildren<PaneLayoutProps>
> = ({ children, ...layoutProps }) => {
  return <PaneLayout {...layoutProps}>{children}</PaneLayout>;
};

// Version of right pane with no default layout
export const RawRightPane: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  return <>{children}</>;
};
