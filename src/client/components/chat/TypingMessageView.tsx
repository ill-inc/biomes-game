import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { TypingIndicator } from "@/client/components/overlays/projected/NameOverlayComponent";
import type { Envelope } from "@/shared/chat/types";

export const TypingMessageView: React.FunctionComponent<{
  envelope: Envelope;
}> = ({ envelope }) => {
  if (!envelope.from) {
    // Must be a ghost.
    return <></>;
  }
  return (
    <div className="message">
      <AvatarView userId={envelope.from} />
      <div>
        <LinkableUsername who={envelope.from} />
        <div>
          <TypingIndicator />
        </div>
      </div>
    </div>
  );
};
