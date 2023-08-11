import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import type { CatchMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import { stringToItemBag } from "@/shared/game/items_serde";
import { anyMapValue } from "@/shared/util/collections";

export function prettyFishLength(fishLength: number) {
  let inches = Math.round(fishLength * 39.3701);
  const feet = Math.floor(inches / 12);
  inches %= 12;

  if (feet === 0 && inches === 0) {
    return "Small Fry";
  }

  return `${feet > 0 ? `${feet.toFixed(0)}' ` : ""} ${inches.toFixed(0)}"`;
}

export const CatchMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: CatchMessage;
}> = ({ envelope, message }) => {
  const heroItem = anyMapValue(stringToItemBag(message.contentsString))!;
  if (!heroItem || !envelope.from) {
    return <></>;
  }
  return (
    <div className="message catch center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} />
        </span>
        {` `}
        caught a {prettyFishLength(heroItem.item.fishLength ?? 0)}{" "}
        {heroItem.item.displayName}!
      </div>
    </div>
  );
};
