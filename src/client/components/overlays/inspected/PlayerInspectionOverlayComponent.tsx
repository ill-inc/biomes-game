import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";

import type { InspectableOverlay } from "@/client/game/resources/overlays";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import pluralize from "@/shared/plural";

export const PlayerInspectionOverlayComponent: React.FunctionComponent<{
  overlay: InspectableOverlay;
}> = ({ overlay }) => {
  const { socialManager, reactResources } = useClientContext();
  const ruleset = reactResources.use("/ruleset/current");
  const userBundle = useCachedUserInfo(socialManager, overlay.entityId);
  if (!ruleset.canInspectPlayer()) return <></>;

  const shortcuts: InspectShortcuts = [];

  shortcuts.push({
    title: "View Profile",
    onKeyDown: () => {
      reactResources.set("/game_modal", {
        kind: "generic_miniphone",
        rootPayload: {
          type: "profile",
          userId: overlay.entityId,
        },
      });
    },
  });

  if (userBundle) {
    shortcuts.push({
      title: `${userBundle.isFollowing ? "Unfollow" : "Follow"} · ${pluralize(
        "follower",
        userBundle.user.numFollowers,
        true
      )}`,
      onKeyDown: () => {
        void socialManager.followUser(
          overlay.entityId,
          !userBundle.isFollowing
        );
      },
    });
  }
  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};
