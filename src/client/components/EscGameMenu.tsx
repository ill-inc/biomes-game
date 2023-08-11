import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  supportsPointerLock,
  usePointerLockEnteringStatus,
  usePointerLockStatus,
} from "@/client/components/contexts/PointerLockContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { ReportFlow } from "@/client/components/social/ReportFlow";
import { DialogButton } from "@/client/components/system/DialogButton";
import { handleQuitMinigame, minigameName } from "@/client/game/util/minigames";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import { clientModFor } from "@/server/shared/minigames/client_mods";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import React, { useEffect, useState } from "react";

export const EscGameMenu: React.FunctionComponent<{}> = React.memo(({}) => {
  const clientContext = useClientContext();
  const { clientMods, reactResources, userId } = clientContext;
  const tweaks = reactResources.use("/tweaks");
  const [isEntering] = usePointerLockEnteringStatus();
  const [isLocked, setIsLocked] = usePointerLockStatus();
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [wasEverLocked, setWasEverLocked] = useState(false);
  const activeMinigame = reactResources.use("/ecs/c/playing_minigame", userId);
  const minigame = useCachedEntity(activeMinigame?.minigame_id);

  useEffect(() => {
    if (tweaks.confirmToCloseTab) {
      window.onbeforeunload = function (_e) {
        return "";
      };
    } else {
      window.onbeforeunload = null;
    }
  }, [tweaks.confirmToCloseTab]);

  useEffect(() => {
    if (isLocked) {
      setWasEverLocked(true);
    } else {
      setIsCreatingReport(false);
    }
  }, [isLocked]);
  const hideReturnToGameButton = getTypedStorageItem(
    "settings.hud.hideReturnToGame"
  );

  const hideChrome = reactResources.use("/canvas_effects/hide_chrome").value;

  if (!supportsPointerLock() || hideChrome) {
    return <></>;
  }

  const clientMod = minigame
    ? clientModFor(
        clientMods,
        minigame.minigame_component?.metadata.kind ?? "simple_race"
      )
    : undefined;

  const escapeActions = [
    ...(clientMod?.escapeActions?.(
      clientContext,
      activeMinigame?.minigame_id ?? INVALID_BIOMES_ID,
      activeMinigame?.minigame_instance_id ?? INVALID_BIOMES_ID
    ) ?? []),
  ].map((e) => ({
    ...e,
    onClick: () => {
      setIsLocked();
      e.onClick?.();
    },
  }));

  if (activeMinigame && minigame) {
    escapeActions.push({
      name: `Leave ${minigameName(minigame)}`,
      onClick: () => {
        setIsLocked();
        fireAndForget(
          handleQuitMinigame(
            clientContext,
            activeMinigame.minigame_id,
            activeMinigame.minigame_instance_id
          )
        );
      },
    });
  }

  // Trigger prompt for user feedback.
  function handleGiveFeedback() {
    setIsCreatingReport(true);
  }

  function onReportSubmitted() {
    // After submitting a report return to the game.
    setIsCreatingReport(false);
    setIsLocked();
  }

  if (!hideReturnToGameButton || activeMinigame) {
    escapeActions.push({
      onClick: () => {
        setIsLocked();
      },
      name: isEntering
        ? "Entering..."
        : `${wasEverLocked ? "Return to Game" : "Enter Game"}`,
    });
  }

  escapeActions.push({
    name: "Give Feedback",
    onClick: () => handleGiveFeedback(),
  });

  return (
    <>
      {(!isLocked || isEntering) && (
        <div className="esc-game-controls select-none">
          {escapeActions.map((e, i) => (
            <DialogButton
              {...e}
              key={e.name ?? String(i)}
              size="large"
              type={i === 0 && escapeActions.length > 1 ? "primary" : undefined}
            />
          ))}
        </div>
      )}
      {isEntering && <div className="enter-wash" />}
      <div className="esc-game-controls">
        {isCreatingReport && (
          <ReportFlow
            onClose={() => onReportSubmitted()}
            target={{ kind: "feedback" }}
          />
        )}
      </div>
    </>
  );
});
