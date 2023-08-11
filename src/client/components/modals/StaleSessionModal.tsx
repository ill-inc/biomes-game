import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useIsStaleSession } from "@/client/components/contexts/StaleSessionContext";
import { ChromelessModal } from "@/client/components/modals/ChromelessModal";
import { DialogButton } from "@/client/components/system/DialogButton";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { useEffect } from "react";

export const StaleSessionModal: React.FunctionComponent<{}> = ({}) => {
  const { audioManager, io } = useClientContext();
  const isStaleSession = useIsStaleSession();

  useEffect(() => {
    if (!io.isHotReload) {
      log.warn("Stale session modal showing, shutting down audio and IO...");
      audioManager.muteAll();
      fireAndForget(io.stop("stale session"));
    }
  }, []);

  return (
    <ChromelessModal extraClassNames="oldsession-modal">
      <div className="explanation">
        {isStaleSession ? (
          <>
            <div className="explanation">
              Biomes is running in another window
            </div>
          </>
        ) : (
          <>
            <div className="explanation">Zzz... seems like you</div>
            <div className="explanation">haven&apos;t been here in a bit</div>
          </>
        )}
      </div>
      <div className="actions">
        <DialogButton
          onClick={() => {
            setTimeout(() => window.location.reload(), 500);
          }}
          type="primary"
          size="large"
        >
          {isStaleSession ? "Play Here" : "Reload Game"}
        </DialogButton>
      </div>
    </ChromelessModal>
  );
};
