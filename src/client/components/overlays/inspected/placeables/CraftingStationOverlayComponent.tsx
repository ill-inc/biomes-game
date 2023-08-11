import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { useCheckPlaceableBuildingRequirements } from "@/client/game/helpers/placeables";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { anItem } from "@/shared/game/item";
import { useMemo } from "react";

export const CraftingStationOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { resources, reactResources } = useClientContext();

  const placeable = reactResources.use(
    "/ecs/c/placeable_component",
    overlay.entityId
  );

  const meetsBuildingReqs = useCheckPlaceableBuildingRequirements(
    overlay.entityId
  );

  const title = useMemo(() => {
    const item = anItem(overlay.itemId);
    const displayName = item.displayName;
    if (meetsBuildingReqs) {
      return displayName;
    }
    const reqs = item.buildingRequirements;
    if (reqs === "roof") {
      return `${displayName} requires a roof to use`;
    } else if (reqs === "noRoof") {
      return `${displayName} requires no roof to use`;
    }
    return `${displayName} requires ${reqs} to use`;
  }, [meetsBuildingReqs, overlay.itemId]);

  if (!placeable) {
    return <></>;
  }

  const shortcuts: InspectShortcuts = [];
  shortcuts.push({
    title,
    disabled: !meetsBuildingReqs,
    onKeyDown: () => {
      resources.set("/game_modal", {
        kind: "crafting",
        payload: {
          type: "crafting_station",
          stationEntityId: overlay.entityId,
        },
      });
    },
  });

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
