import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import type { NpcInspectOverlay } from "@/client/game/resources/overlays";
import { becomeTheNPC } from "@/client/game/scripts/become_npc";

export const NpcOverlayComponent: React.FunctionComponent<{
  overlay: NpcInspectOverlay;
}> = ({ overlay }) => {
  const deps = useClientContext();

  if (!overlay.npcType) {
    return <></>;
  }

  const shortcuts: InspectShortcuts = [];

  if (overlay.npcType.isPet) {
    shortcuts.push({
      title: "Move",
      onKeyDown: () => {
        void becomeTheNPC(deps, overlay.entityId);
      },
    });
  }

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
