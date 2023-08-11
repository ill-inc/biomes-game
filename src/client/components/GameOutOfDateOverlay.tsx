import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { tryExitPointerLock } from "@/client/components/contexts/PointerLockContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { reportClientError } from "@/client/util/request_helpers";
import React, { useEffect, useState } from "react";

export const GameOutOfDateOverlay: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, io } = useClientContext();
  const { outOfDate } = reactResources.use("/server/js");
  const [triggered, setTriggered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const forceReload = () => window.location.reload();
    io.on("forceReload", forceReload);
    return () => {
      io.off("forceReload", forceReload);
    };
  }, []);

  useEffect(() => {
    if (!outOfDate || triggered) {
      return;
    }
    const handle = setTimeout(() => {
      reportClientError("OutOfDate", "OutOfDate JS showing");
      setTriggered(true);
    }, 3 * 60 * 60 * 1000);
    return () => clearTimeout(handle);
  }, [outOfDate, triggered]);

  const shouldDisplay = triggered && !dismissed;

  useEffect(() => {
    if (shouldDisplay) {
      document.body.classList.add("error-showing");
      tryExitPointerLock();
    } else {
      document.body.classList.remove("error-showing");
    }
  }, [shouldDisplay]);

  if (!shouldDisplay) {
    return <></>;
  }

  return (
    <div className="biomes-box dialog opaque game-error-overlay">
      <div className="title-bar">
        <div className="title">Update Required</div>
      </div>
      <div className="dialog-contents">
        <div className="centered-text">
          Your game is out of date, please reload to see the latest in Biomes!
        </div>
        <DialogButton type="primary" onClick={() => window.location.reload()}>
          Reload Now
        </DialogButton>
        <DialogButton onClick={() => setDismissed(true)}>
          Reload Later (Not recommended)
        </DialogButton>
      </div>
    </div>
  );
};
