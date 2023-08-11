import type { PropsWithChildren } from "react";

export const RightBarItem: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  return <>{children ?? <div className="toolbar-icon"></div>}</>;
};
