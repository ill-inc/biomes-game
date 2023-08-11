import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { ProfanityFiltered } from "@/client/components/chat/ProfanityFiltered";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type { TextMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import biomesLogoIcon from "/public/hud/biomes-logo-24.png";

export const TextMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: TextMessage;
}> = ({ message, envelope }) => {
  if (!envelope.from) {
    return (
      <div className="message robo center">
        <ShadowedImage extraClassNames="avatar" src={biomesLogoIcon.src} />
        {message.content}
      </div>
    );
  } else {
    let className = "message";
    className += envelope.to ? " dm" : "";
    className += envelope.spatial?.volume == "yell" ? " yell" : "";
    return (
      <div className={className}>
        <AvatarView userId={envelope.from} />
        <div>
          <div className="actor">
            <LinkableUsername who={envelope.from} />
            {envelope.to && (
              <span>
                {` > `}
                <LinkableUsername who={envelope.to} />
              </span>
            )}
            {envelope.spatial?.volume == "yell" && <> yelled</>}
          </div>
          <ProfanityFiltered>{message.content}</ProfanityFiltered>
        </div>
      </div>
    );
  }
};
