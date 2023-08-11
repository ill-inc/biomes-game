import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { LikeShortcutText } from "@/client/components/overlays/inspected/placeables/FramePlaceableOverlayComponent";
import type { GroupInspectOverlay } from "@/client/game/resources/overlays";
import { useUserCanAction } from "@/client/util/permissions_manager_hooks";
import { useCachedGroupBundle } from "@/client/util/social_manager_hooks";
import { UnGroupEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";

export const GroupInspectionOverlayComponent: React.FunctionComponent<{
  overlay: GroupInspectOverlay;
}> = ({ overlay }) => {
  const { socialManager, userId, reactResources, events } = useClientContext();
  const ruleset = reactResources.use("/ruleset/current");
  const groupBundle = useCachedGroupBundle(socialManager, overlay.entityId);
  const canDestroy = useUserCanAction(overlay.entityId, "destroy");

  if (!ruleset.canInspectPlayer()) return <></>;

  const owner = groupBundle
    ? `${groupBundle.ownerBiomesUser?.username}'s`
    : undefined;

  const shortcuts: InspectShortcuts = [];

  if (!groupBundle) return <></>;

  shortcuts.push({
    title: `Inspect ${owner} Build`,
    onKeyDown: () => {
      reactResources.set("/game_modal", {
        kind: "generic_miniphone",
        rootPayload: {
          type: "social_detail",
          documentId: overlay.entityId,
          documentType: "environment_group",
        },
      });
    },
  });

  if (canDestroy) {
    shortcuts.push({
      title: "Deconstruct",
      onKeyDown: () => {
        fireAndForget(
          events.publish(
            new UnGroupEvent({
              id: groupBundle.id,
              user_id: userId,
              remove_voxels: false,
            })
          )
        );
      },
    });
  } else {
    shortcuts.push({
      title: (
        <LikeShortcutText
          isLikedByQuerier={groupBundle.isLikedByQuerier}
          numLikes={groupBundle.numLikes}
        />
      ),
      onKeyDown: () => {
        void socialManager.likeGroup(
          overlay.entityId,
          !groupBundle.isLikedByQuerier
        );
      },
    });
  }

  return (
    <CursorInspectionComponent overlay={overlay} fade shortcuts={shortcuts} />
  );
};
