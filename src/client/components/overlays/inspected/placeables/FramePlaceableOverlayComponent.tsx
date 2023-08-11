import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { useJoinShortcut } from "@/client/components/minigames/helpers";
import type {
  InspectShortcut,
  InspectShortcuts,
} from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { Img } from "@/client/components/system/Img";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import type { ClientReactResources } from "@/client/game/resources/types";

import { useUserCanAction } from "@/client/util/permissions_manager_hooks";
import { useCachedPostBundle } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import { useCallback, useState } from "react";
import heartBorderedIcon from "/public/hud/icon-16-heart-bordered.png";
import heartFilledIcon from "/public/hud/icon-16-heart-filled-bordered.png";

const maybeChangeContents = (
  reactResources: ClientReactResources,
  overlay: PlaceableInspectOverlay
) => {
  const canChange = useUserCanAction(overlay.entityId, "destroy");
  if (!canChange) {
    return undefined;
  }
  return {
    title: "Change Contents",
    onKeyDown: () => {
      reactResources.set("/game_modal", {
        kind: "generic_miniphone",
        rootPayload: {
          type: "change_frame_contents",
          placeableId: overlay.entityId,
        },
      });
    },
  } as InspectShortcut;
};

export const LikeShortcutText: React.FunctionComponent<{
  isLikedByQuerier?: boolean;
  numLikes?: number;
}> = ({ isLikedByQuerier, numLikes }) => {
  return (
    <>
      {isLikedByQuerier ? "Unlike" : "Like"}
      {numLikes !== undefined && numLikes > 0 && (
        <div className="inspect-likes">
          {isLikedByQuerier ? (
            <Img src={heartFilledIcon.src} />
          ) : (
            <Img src={heartBorderedIcon.src} />
          )}{" "}
          {numLikes}
        </div>
      )}
    </>
  );
};

const BiomesPostOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
  postId: BiomesId;
}> = ({ overlay, postId }) => {
  const { socialManager, reactResources, gardenHose } = useClientContext();
  const photoBundle = useCachedPostBundle(socialManager, postId);

  const doLike = useCallback(async () => {
    if (!photoBundle) return false;
    await socialManager.likePost(
      photoBundle?.id,
      !photoBundle?.isLikedByQuerier
    );
  }, [photoBundle?.isLikedByQuerier]);

  const shortcuts: InspectShortcuts = [
    {
      title: `View ${
        photoBundle ? `${photoBundle.author.username}'s` : ""
      } photo`,
      onKeyDown: () => {
        gardenHose.publish({ kind: "inspect_frame" });
        reactResources.set("/game_modal", {
          kind: "generic_miniphone",
          rootPayload: {
            type: "social_detail",
            documentType: "post",
            documentId: postId,
          },
        });
      },
    },
  ];

  const changeContents = maybeChangeContents(reactResources, overlay);

  if (changeContents) {
    shortcuts.push(changeContents);
  } else {
    shortcuts.push({
      title: (
        <LikeShortcutText
          isLikedByQuerier={photoBundle?.isLikedByQuerier}
          numLikes={photoBundle?.numLikes}
        />
      ),
      onKeyDown: () => {
        void doLike();
      },
    });
  }

  return <CursorInspectionComponent shortcuts={shortcuts} overlay={overlay} />;
};

const MinigameFrameOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
  minigameId: BiomesId;
}> = ({ overlay, minigameId }) => {
  const [error, setError] = useState("");
  const { reactResources } = useClientContext();

  const minigame = useCachedEntity(minigameId);
  const joinShortcut = useJoinShortcut(
    minigameId,
    `Play ${minigame?.label?.text ?? "Game"}`,
    setError
  );
  const shortcuts: InspectShortcuts = [];
  if (minigame) {
    shortcuts.push(joinShortcut);
  }

  const changeContents = maybeChangeContents(reactResources, overlay);

  if (changeContents) {
    shortcuts.push(changeContents);
  }

  return (
    <CursorInspectionComponent
      error={error}
      title={"Minigame"}
      shortcuts={shortcuts}
      overlay={overlay}
    />
  );
};

const BlankOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources } = useClientContext();
  const canChange = maybeChangeContents(reactResources, overlay);

  if (!canChange) {
    return <></>;
  }

  const shortcuts: InspectShortcuts = [canChange];

  return <CursorInspectionComponent overlay={overlay} shortcuts={shortcuts} />;
};

export const FramePlaceableOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources } = useClientContext();
  const pictureFrameContents = reactResources.use(
    "/ecs/c/picture_frame_contents",
    overlay.entityId
  );

  if (pictureFrameContents?.photo_id) {
    return (
      <BiomesPostOverlayComponent
        overlay={overlay}
        postId={pictureFrameContents.photo_id}
      />
    );
  } else if (pictureFrameContents?.minigame_id) {
    return (
      <MinigameFrameOverlayComponent
        overlay={overlay}
        minigameId={pictureFrameContents.minigame_id}
      />
    );
  } else {
    return <BlankOverlayComponent overlay={overlay} />;
  }
};
