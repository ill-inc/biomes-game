import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { useUserCanAction } from "@/client/util/permissions_manager_hooks";

export const TextSignOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources } = useClientContext();
  const canChange = useUserCanAction(overlay.entityId, "destroy");

  if (!canChange) {
    return <></>;
  }

  return (
    <CursorInspectionComponent
      overlay={overlay}
      shortcuts={[
        {
          title: "Edit Text",
          onKeyDown: () => {
            reactResources.set("/game_modal", {
              kind: "text_sign_configure_modal",
              placeableId: overlay.entityId,
            });
          },
        },
      ]}
    />
  );
};
