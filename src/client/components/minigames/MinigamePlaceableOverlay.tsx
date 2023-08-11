import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { MinigamePlaceableBundle } from "@/client/components/minigames/helpers";
import {
  defaultMinigameInspectShortcuts,
  useJoinShortcut,
  useMinigamePlaceableBundle,
} from "@/client/components/minigames/helpers";
import { SimpleRaceFinishOverlayComponent } from "@/client/components/minigames/simple_race/SimpleRaceFinishOverlayComponent";
import { SimpleRaceStartOverlayComponent } from "@/client/components/minigames/simple_race/SimpleRaceStartOverlayComponent";
import { SpleefEntryOverlayComponent } from "@/client/components/minigames/spleef/SpleefEntryOverlayComponent";
import type {
  InspectShortcut,
  InspectShortcuts,
} from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { useError } from "@/client/components/system/MaybeError";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { BikkieIds } from "@/shared/bikkie/ids";

export const UnboundMinigamePlaceableOverlay: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources, authManager, userId } = useClientContext();
  const [placedBy, createdBy] = reactResources.useAll(
    ["/ecs/c/placed_by", overlay.entityId],
    ["/ecs/c/created_by", overlay.entityId]
  );

  const isPlacerOrCreator = placedBy?.id === userId || createdBy?.id === userId;
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");
  const canConfigure = isPlacerOrCreator || isAdmin;

  const shortcuts: InspectShortcut[] = [];

  if (canConfigure) {
    shortcuts.push({
      title: `Configure${isAdmin && !isPlacerOrCreator ? " (Admin)" : ""}`,
      onKeyDown: () => {
        reactResources.set("/game_modal", {
          kind: "minigame_placeable_configure",
          placeableId: overlay.entityId,
        });
      },
    });
  }

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};

export const MinigameLeaderboardPlaceableOverlay: React.FunctionComponent<{
  bundle: MinigamePlaceableBundle;
}> = ({ bundle }) => {
  const clientContext = useClientContext();

  const shortcuts: InspectShortcuts = [];
  const [error, setError] = useError();
  const joinShortcut = useJoinShortcut(bundle.minigameId, "Play", setError);

  if (!bundle.userCurrentMinigame && !bundle.userIsPlayingGame) {
    shortcuts.push(joinShortcut);
    shortcuts.push(...defaultMinigameInspectShortcuts(clientContext, bundle));
  }

  return (
    <CursorInspectionComponent
      error={error}
      overlay={bundle.overlay}
      shortcuts={shortcuts}
    />
  );
};

export const DefaultBoundMinigamePlaceableOverlay: React.FunctionComponent<{
  bundle: MinigamePlaceableBundle;
}> = ({ bundle }) => {
  const clientContext = useClientContext();
  const [_error, setError] = useError();

  const shortcuts: InspectShortcuts = [];
  const joinShortcut = useJoinShortcut(bundle.minigameId, "Play", setError);
  if (
    bundle.userIsPlayingGame &&
    bundle.userCurrentInstance &&
    bundle.userCurrentMinigame
  ) {
    return <></>;
  }

  shortcuts.push(joinShortcut);
  shortcuts.push(...defaultMinigameInspectShortcuts(clientContext, bundle));

  return (
    <CursorInspectionComponent
      overlay={bundle.overlay}
      title={bundle.minigameName}
      shortcuts={shortcuts}
    />
  );
};

export const BoundMinigamePlaceableOverlay: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const bundle = useMinigamePlaceableBundle(overlay);
  if (!bundle) {
    return <></>;
  }

  switch (overlay.itemId) {
    case BikkieIds.simpleRaceStart:
      return <SimpleRaceStartOverlayComponent bundle={bundle} />;
    case BikkieIds.simpleRaceFinish:
      return <SimpleRaceFinishOverlayComponent bundle={bundle} />;
    case BikkieIds.minigameLeaderboard:
    case BikkieIds.smallLeaderboard:
      return <MinigameLeaderboardPlaceableOverlay bundle={bundle} />;
    case BikkieIds.spleefStart:
    case BikkieIds.deathmatchEnter:
    case BikkieIds.spleefSpawn:
      return <SpleefEntryOverlayComponent bundle={bundle} />;

    default:
      return <DefaultBoundMinigamePlaceableOverlay bundle={bundle} />;
  }
};

export const MinigamePlaceableOverlay: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources } = useClientContext();
  const [minigameElement] = reactResources.useAll([
    "/ecs/c/minigame_element",
    overlay.entityId,
  ]);

  if (!minigameElement) {
    return <UnboundMinigamePlaceableOverlay overlay={overlay} />;
  }

  return <BoundMinigamePlaceableOverlay overlay={overlay} />;
};
