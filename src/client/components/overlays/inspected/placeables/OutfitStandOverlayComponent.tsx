import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useOutfit } from "@/client/components/hooks/outfit";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { slotRefFromSelection } from "@/client/game/resources/inventory";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { useCallback } from "react";

export const OutfitStandOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources, permissionsManager } = useClientContext();
  const { addToOutfit, equipOutfit } = useOutfit({
    outfitId: overlay.entityId,
  });
  const selection = reactResources.use("/hotbar/selection");
  const entityPos = reactResources.use("/ecs/c/position", overlay.entityId)?.v;
  const robotId =
    entityPos && permissionsManager.robotIdAt(reactResources, entityPos);
  const creatorId = reactResources.use(
    "/ecs/c/created_by",
    robotId ?? INVALID_BIOMES_ID
  )?.id;
  const localPlayerId = reactResources.use("/scene/local_player")?.id;
  const isOwner = creatorId === localPlayerId;
  const isHoldingWearable = selection?.item?.isWearable;

  const openInspectView = useCallback(() => {
    reactResources.set("/game_modal", {
      kind: "generic_miniphone",
      rootPayload: {
        type: "outfit_stand",
        placeableId: overlay.entityId,
      },
    });
  }, [overlay.entityId, overlay.itemId]);

  const addToOutfitCallback = useCallback(() => {
    const itemRef = slotRefFromSelection(selection);
    if (!itemRef) return;
    addToOutfit(itemRef);
  }, [overlay.entityId, overlay.itemId, selection]);

  const shortcuts: InspectShortcuts = [];
  if (isOwner) {
    shortcuts.push(
      {
        title: "Equip",
        onKeyDown: equipOutfit,
      },
      {
        title: "Edit",
        onKeyDown: openInspectView,
      }
    );

    if (isHoldingWearable) {
      shortcuts.push({
        title: "Place Wearable",
        onKeyDown: addToOutfitCallback,
      });
    }
  }

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
