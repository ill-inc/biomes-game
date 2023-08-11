import {
  AvatarView,
  LinkablePhotoPreview,
  LinkableUsername,
} from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { PhotoFeaturingStringLinked } from "@/client/components/social/PhotoFeaturingStringLinked";
import { LikeButton } from "@/client/components/system/LikeButton";
import { MinigamePlayButton } from "@/client/components/system/MinigamePlayButton";
import { WarpButton } from "@/client/components/system/WarpButton";
import { useCachedPostBundle } from "@/client/util/social_manager_hooks";
import type { PhotoMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { FeedPostBundle } from "@/shared/types";
import { motion } from "framer-motion";

function getLocationNameForPhoto(_photo: FeedPostBundle) {
  return undefined;
}

export const PhotoMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: PhotoMessage;
  onLoadImage?: () => any;
}> = ({ message, envelope, onLoadImage }) => {
  const { socialManager } = useClientContext();

  if (!envelope.from) {
    // Don't support server-side photos yet.
    return <></>;
  }

  const post = useCachedPostBundle(socialManager, message.postId);
  let captionString: JSX.Element = <></>;

  if (!post) {
    return <></>;
  }

  if (post.caption) {
    captionString = <span className="caption">{post.caption}</span>;
  }
  const userString = <PhotoFeaturingStringLinked post={post} linkType="open" />;
  const ln = getLocationNameForPhoto(post);
  const locationString = ln ? ` in ${getLocationNameForPhoto(post)}` : "";

  const playingString = post.minigame
    ? ` while playing ${post.minigame.label ?? post.minigame.minigameType}`
    : "";
  return (
    <div className="message photo">
      <AvatarView userId={envelope.from} />
      <div className="details">
        <div>
          <LinkableUsername who={envelope.from} /> {` `} snapped a photo{" "}
          {userString}
          {locationString}
          {playingString}
          <br />
          {captionString}
        </div>
        <div className="imaged-message-details">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 1 }}
            className="imaged-message-preview"
          >
            <LinkablePhotoPreview post={post} onLoadImage={onLoadImage} />
          </motion.div>
          <div className="imaged-message-actions">
            <div className="image-ufi-button">
              <LikeButton documentType="post" document={post} />
            </div>
            {post.metadata && post.allowWarping && (
              <div className="image-ufi-button">
                <WarpButton
                  buttonType="inline-chat"
                  document={post}
                  documentType="post"
                />
              </div>
            )}
            {post?.minigame && (
              <MinigamePlayButton
                buttonType="inline-chat"
                minigame={post.minigame}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
