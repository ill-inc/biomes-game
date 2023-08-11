import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { useCachedUsername } from "@/client/util/social_manager_hooks";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { useCallback } from "react";

export const MailboxOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources, permissionsManager } = useClientContext();

  const entityPos = reactResources.use("/ecs/c/position", overlay.entityId)?.v;
  const robotId =
    entityPos && permissionsManager.robotIdAt(reactResources, entityPos);
  const creatorId = reactResources.use(
    "/ecs/c/created_by",
    robotId ?? INVALID_BIOMES_ID
  )?.id;
  const creatorName = useCachedUsername(creatorId);
  const localPlayerId = reactResources.use("/scene/local_player")?.id;
  const yours = creatorId === localPlayerId;
  const openCallback = useCallback(() => {
    reactResources.set("/game_modal", {
      kind: "generic_miniphone",
      rootPayload: {
        type: "mailbox",
        placeableId: overlay.entityId,
        itemId: overlay.itemId,
      },
    });
  }, [overlay.entityId, overlay.itemId]);

  const shortcuts: InspectShortcuts = [
    {
      title: yours
        ? "Open Your Mailbox"
        : creatorName
        ? `Open ${creatorName}'s Mailbox`
        : "Open Unprotected Mailbox",
      onKeyDown: openCallback,
    },
  ];

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
