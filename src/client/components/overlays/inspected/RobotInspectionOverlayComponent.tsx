import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";

import type { InspectableOverlay } from "@/client/game/resources/overlays";
import { useMemo } from "react";

export const RobotInspectionOverlayComponent: React.FunctionComponent<{
  overlay: InspectableOverlay;
}> = ({ overlay }) => {
  const { reactResources, userId, authManager } = useClientContext();

  const [becomeNpc, createdBy] = reactResources.useAll(
    ["/scene/npc/become_npc"],
    ["/ecs/c/created_by", overlay.entityId]
  );

  const shortcuts = useMemo<InspectShortcuts>(() => {
    const result: InspectShortcuts = [];
    result.push({
      title: "Talk",
      onKeyDown: () => {
        reactResources.set("/game_modal", {
          kind: "talk_to_robot",
          entityId: overlay.entityId,
        });
      },
    });

    const adminEntity = reactResources.get(
      "/ecs/c/admin_entity",
      overlay.entityId
    );
    const isAdmin = authManager.currentUser.hasSpecialRole("admin");
    const canChangeSettings =
      createdBy?.id === userId || (adminEntity && isAdmin);
    if (canChangeSettings) {
      result.push({
        title: `Settings${adminEntity && isAdmin ? " (Admin)" : ""}`,
        onKeyDown: () => {
          reactResources.set("/game_modal", {
            kind: "generic_miniphone",
            rootPayload: {
              type: "robot_main_menu",
              entityId: overlay.entityId,
            },
          });
        },
      });
    }

    return result;
  }, [overlay.entityId, createdBy?.id]);

  if (becomeNpc.kind === "active") {
    return <></>;
  }

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
