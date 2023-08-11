import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { MinigamePlaceableBundle } from "@/client/components/minigames/helpers";
import {
  defaultMinigameInspectShortcuts,
  useJoinShortcut,
} from "@/client/components/minigames/helpers";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { useError } from "@/client/components/system/MaybeError";

import { spleefNotReadyReason } from "@/server/shared/minigames/spleef/util";
import { QuitMinigameEvent } from "@/shared/ecs/gen/events";

import { useEffect } from "react";

export const SpleefEntryOverlayComponent: React.FunctionComponent<{
  bundle: MinigamePlaceableBundle;
}> = ({ bundle }) => {
  const clientContext = useClientContext();
  const { userId, events } = clientContext;
  const [error, setError] = useError();
  const joinShortcut = useJoinShortcut(bundle.minigameId, "Play", setError);

  const notReadyReason =
    !bundle.minigameComponent.ready &&
    spleefNotReadyReason(bundle.minigameComponent);
  useEffect(() => {
    if (notReadyReason) {
      setError(notReadyReason);
    }
  }, [notReadyReason]);

  const shortcuts: InspectShortcuts = [];
  if (bundle.userIsPlayingGame && bundle.userCurrentMinigame) {
    shortcuts.push({
      title: "Leave Game",
      onKeyDown: async () => {
        await events.publish(
          new QuitMinigameEvent({
            id: userId,
            minigame_id: bundle.userCurrentMinigame!.minigame_id,
            minigame_instance_id:
              bundle.userCurrentMinigame!.minigame_instance_id,
          })
        );
      },
    });
  } else {
    shortcuts.push(joinShortcut);
  }

  shortcuts.push(...defaultMinigameInspectShortcuts(clientContext, bundle));

  return (
    <CursorInspectionComponent
      overlay={bundle.overlay}
      error={error}
      title={bundle.minigameName}
      subtitle={
        bundle.minigameCreator && `by ${bundle.minigameCreator.user.username}`
      }
      shortcuts={shortcuts}
    />
  );
};
