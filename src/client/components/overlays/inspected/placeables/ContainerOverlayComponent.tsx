import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { useUserCanAction } from "@/client/util/permissions_manager_hooks";
import { StartPlaceableAnimationEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";

export const ContainerOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources, events } = useClientContext();
  const canChange = useUserCanAction(overlay.entityId, "destroy");

  const shortcuts: InspectShortcuts = canChange
    ? [
        {
          title: "Open Container",
          onKeyDown: () => {
            fireAndForget(
              events.publish(
                new StartPlaceableAnimationEvent({
                  id: overlay.entityId,
                  animation_type: "open",
                })
              )
            );
            setTimeout(() => {
              reactResources.set("/game_modal", {
                kind: "generic_miniphone",
                rootPayload: {
                  type: "container",
                  placeableId: overlay.entityId,
                  itemId: overlay.itemId,
                },
                onClose: () => {
                  fireAndForget(
                    events.publish(
                      new StartPlaceableAnimationEvent({
                        id: overlay.entityId,
                        animation_type: "close",
                      })
                    )
                  );
                },
              });
            }, 600);
          },
        },
      ]
    : [];

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
