import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import type { FollowUserMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";

export const FollowMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: FollowUserMessage;
}> = ({ message, envelope }) => {
  const { socialManager } = useClientContext();
  const user = useCachedUserInfo(socialManager, message.targetId);

  if (!envelope.from || !user) {
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
        followed
        {` `}
        <LinkableUsername who={message.targetId} you="you" />
      </div>
    </div>
  );
};
