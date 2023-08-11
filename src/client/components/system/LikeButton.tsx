import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { Img } from "@/client/components/system/Img";
import type {
  FeedPostBundle,
  GroupDetailBundle,
  SocialDocumentType,
} from "@/shared/types";
import type { PropsWithChildren } from "react";
import React, { useCallback, useState } from "react";
import borderedHeartIcon from "/public/hud/icon-16-heart-bordered.png";
import filledHeartIcon from "/public/hud/icon-16-heart-filled-bordered.png";

function actionButtonClassName(disabled?: boolean) {
  let className = `action-button link like-button`;
  if (disabled) {
    className += " disabled";
  }
  return className;
}

export const LikeButton: React.FunctionComponent<
  PropsWithChildren<{
    documentType: SocialDocumentType;
    document: FeedPostBundle | GroupDetailBundle;
  }>
> = ({ documentType, document, children }) => {
  const { socialManager } = useClientContext();
  const [likeButtonDisabled, setLikeButtonDisabled] = useState(false);

  const doLike = useCallback(async (isLiked: boolean) => {
    setLikeButtonDisabled(true);
    switch (documentType) {
      case "post":
        await socialManager.likePost(document.id, isLiked);
        break;
      case "environment_group":
        await socialManager.likeGroup(document.id, isLiked);
        break;
      default:
        throw Error(`Document type ${documentType} is not supported`);
    }
    setLikeButtonDisabled(false);
  }, []);

  let imagePayload: JSX.Element | undefined;
  if (document.isLikedByQuerier) {
    imagePayload = <Img className="heart" src={filledHeartIcon.src} />;
  } else {
    imagePayload = <Img className="heart" src={borderedHeartIcon.src} />;
  }

  return (
    <>
      <button
        className={actionButtonClassName()}
        onClick={(e) => {
          e.preventDefault();
          void doLike(!document.isLikedByQuerier);
        }}
        disabled={likeButtonDisabled}
      >
        {imagePayload}
        {children}
        Like
      </button>
    </>
  );
};
