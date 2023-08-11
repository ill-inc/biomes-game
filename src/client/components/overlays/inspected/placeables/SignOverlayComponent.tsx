import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";

export const SignOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { resources, reactResources } = useClientContext();
  const item = relevantBiscuitForEntityId(resources, overlay.entityId);

  const shortcuts: InspectShortcuts = [
    {
      title: item?.customInspectText ?? "Read",
      onKeyDown: () => {
        switch (item?.readable) {
          case "immsersive":
            reactResources.set("/game_modal", {
              kind: "immersive_sign",
              entityId: overlay.entityId,
            });
            break;

          case "sheet":
            reactResources.set("/game_modal", {
              kind: "generic_miniphone",
              rootPayload: {
                type: "sign",
                placeableId: overlay.entityId,
              },
            });
            break;
        }
      },
    },
  ];

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
