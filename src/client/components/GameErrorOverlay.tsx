import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { tryExitPointerLock } from "@/client/components/contexts/PointerLockContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { reportClientError } from "@/client/util/request_helpers";
import { log } from "@/shared/logging";
import React, { useEffect, useState } from "react";

export const GameErrorOverlay: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  const currentModal = reactResources.use("/game_modal")?.kind;
  const socketStatus = reactResources.use("/server/socket");

  const [shouldDisplay, setShouldDisplay] = useState(false);

  useEffect(() => {
    if (shouldDisplay) {
      document.body.classList.add("error-showing");
      tryExitPointerLock();
    } else {
      document.body.classList.remove("error-showing");
    }
  }, [shouldDisplay]);

  // After 2000ms of being disconnected, show a window
  const healthy = socketStatus.status === "ready";
  useEffect(() => {
    if (healthy || currentModal === "staleSession") {
      setShouldDisplay(false);
      return;
    }
    const handle = setTimeout(() => {
      reportClientError("Disconnected", "Disconnected from game showing", {
        socketStatus: socketStatus.status,
        currentModal,
      });
      log.error("Showing disconnected from game");
      setShouldDisplay(true);
    }, 1500);
    return () => clearTimeout(handle);
  }, [healthy]);

  if (!shouldDisplay) {
    return <></>;
  }

  return (
    <div className="biomes-box dialog game-error-overlay">
      <div className="title-bar">
        <div className="title">Disconnected</div>
      </div>
      <div className="dialog-contents">
        <p className="centered-text">
          You are disconnected from the game. We will try to automatically
          reconnect you.
        </p>
        <DialogButton
          onClick={() => {
            window.location.reload();
          }}
        >
          Reconnect Manually
        </DialogButton>
      </div>
    </div>
  );
};
