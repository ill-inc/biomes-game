import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import type { Envelope } from "@/shared/chat/types";

export const NewSessionMessageView: React.FunctionComponent<{
  envelope: Envelope;
}> = ({ envelope }) => {
  if (!envelope.from) {
    // Must be a ghost.
    return <></>;
  }
  return (
    <div className="message emote center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} />
        </span>
        {` `}
        entered the world
      </div>
    </div>
  );
};
