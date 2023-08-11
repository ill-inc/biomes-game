import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import React from "react";

export const UnsupportedBrowserHUD: React.FunctionComponent<{}> = ({}) => {
  const { clientConfig } = useClientContext();
  if (!clientConfig.unsupportedBrowser) {
    return <></>;
  }

  return (
    <div className="unsupported-browser-hud">
      Unsupported browser, you may see issues
    </div>
  );
};
