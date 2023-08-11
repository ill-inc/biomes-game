import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { willEverBeReady } from "@/shared/zrpc/core";
import React from "react";

export const NetworkErrorHUD: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  const socket = reactResources.use("/server/socket");

  if (socket.status === "ready" || !willEverBeReady(socket.status)) {
    return <></>;
  }

  return <div className="network-error-hud">Poor Connection</div>;
};
