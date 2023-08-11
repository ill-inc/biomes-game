import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { MinigamePlaceableBundle } from "@/client/components/minigames/helpers";
import {
  defaultMinigameInspectShortcuts,
  useJoinShortcut,
} from "@/client/components/minigames/helpers";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { useError } from "@/client/components/system/MaybeError";
import { simpleRaceNotReadyReason } from "@/server/shared/minigames/simple_race/util";
import { useEffect } from "react";

export const SimpleRaceStartOverlayComponent: React.FunctionComponent<{
  bundle: MinigamePlaceableBundle;
}> = ({ bundle }) => {
  const [error, setError] = useError();
  const clientContext = useClientContext();
  const { reactResources } = clientContext;

  const title = bundle.userIsPlayingGame ? undefined : bundle.minigameName;
  const subtitle = bundle.userIsPlayingGame
    ? undefined
    : bundle.minigameCreator?.user.username;

  const isCreator = bundle.minigameCreatedBy?.id === clientContext.userId;
  const isAdmin = clientContext.authManager.currentUser.hasSpecialRole("admin");
  const canConfigure = isCreator || isAdmin;

  const joinShortcut = useJoinShortcut(bundle.minigameId, "Play", setError);

  const notReadyReason =
    !bundle.minigameComponent.ready &&
    simpleRaceNotReadyReason(bundle.minigameComponent);
  useEffect(() => {
    if (notReadyReason) {
      setError(notReadyReason);
    }
  }, [notReadyReason]);

  const shortcuts: InspectShortcuts = [];
  if (!bundle.userCurrentMinigame && !bundle.userIsPlayingGame) {
    shortcuts.push(joinShortcut);

    if (!canConfigure) {
      shortcuts.push({
        title: "View Leaderboard",
        onKeyDown: () => {
          reactResources.set("/game_modal", {
            kind: "generic_miniphone",
            rootPayload: {
              type: "minigame_leaderboard",
              minigameId: bundle.minigameId,
            },
          });
        },
      });
    }
  }

  shortcuts.push(...defaultMinigameInspectShortcuts(clientContext, bundle));

  return (
    <CursorInspectionComponent
      title={title}
      error={error}
      subtitle={subtitle}
      overlay={bundle.overlay}
      shortcuts={shortcuts}
    />
  );
};
