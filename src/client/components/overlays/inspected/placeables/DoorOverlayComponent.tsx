import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { StartPlaceableAnimationEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";

export const DoorOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { events, reactResources } = useClientContext();

  const door = reactResources.use(
    "/ecs/c/placeable_component",
    overlay.entityId
  );
  if (!door) {
    return <></>;
  }

  const shortcuts: InspectShortcuts = [
    {
      title: `${door?.animation?.type == "open" ? "Close" : "Open"} Door`,
      onKeyDown: () => {
        fireAndForget(
          events.publish(
            new StartPlaceableAnimationEvent({
              id: overlay.entityId,
              animation_type:
                door?.animation?.type == "open" ? "close" : "open",
            })
          )
        );
      },
    },
  ];

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
