import {
  AvatarView,
  LinkableGroupName,
  LinkablePostName,
  LinkableUsername,
} from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  useCachedGroupBundle,
  useCachedPostBundle,
} from "@/client/util/social_manager_hooks";
import type { LikeMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { assertNever } from "@/shared/util/type_helpers";

const LikePostMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: LikeMessage;
  postId: BiomesId;
}> = ({ envelope, postId }) => {
  const { socialManager } = useClientContext();
  const post = useCachedPostBundle(socialManager, postId);

  if (!envelope.from || !post) {
    // Don't support server-side emotes yet
    return <></>;
  }

  return (
    <div className="message emote center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} you="You" />
        </span>
        {` `}
        liked
        {` `}
        <LinkablePostName post={post} />
      </div>
    </div>
  );
};

const LikeGroupMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: LikeMessage;
  groupId: BiomesId;
}> = ({ envelope, groupId }) => {
  const { socialManager } = useClientContext();
  const group = useCachedGroupBundle(socialManager, groupId);

  if (!envelope.from || !group) {
    // Don't support server-side emotes yet
    return <></>;
  }

  return (
    <div className="message follow center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} you="You" />
        </span>
        {` `}
        liked
        {` `}
        <LinkableGroupName group={group} />
      </div>
    </div>
  );
};

export const LikeMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: LikeMessage;
}> = ({ message, envelope }) => {
  if (!envelope.from) {
    // Don't support server-side emotes yet
    return <></>;
  }

  switch (message.documentType) {
    case "post":
      return (
        <LikePostMessageView
          envelope={envelope}
          message={message}
          postId={message.documentId}
        />
      );
    case "environment_group":
      return (
        <LikeGroupMessageView
          envelope={envelope}
          message={message}
          groupId={message.documentId}
        />
      );
    default:
      assertNever(message.documentType);
      break;
  }

  return <></>;
};
