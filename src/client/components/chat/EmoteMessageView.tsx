import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import type { EmoteMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { EmoteType } from "@/shared/ecs/gen/types";

const emoteLookup = {
  applause: "claps",
  dance: "dances",
  flex: "flexes",
  laugh: "laughs",
  point: "points",
  rock: "rocks",
  sit: "sits",
  wave: "waves",
  warp: "warped",
  warpHome: "warped using their Homestone",
} as { [emoteType in EmoteType]: string };

export const EmoteMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: EmoteMessage;
}> = ({ message, envelope }) => {
  if (!envelope.from) {
    // Don't support server-side emotes yet
    return <></>;
  }
  const emoteDesc = emoteLookup[message.emote_type] || message.emote_type;
  return (
    <div className="message emote center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} />
        </span>
        {` `}
        {emoteDesc}
      </div>
    </div>
  );
};
