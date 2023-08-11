import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { getBiscuit } from "@/shared/bikkie/active";
import type { DeathMessage, DeathReason } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import { sample } from "lodash";
import { useMemo } from "react";

export function makeDeathReason(
  deathReason?: DeathReason,
  useFirstPerson?: boolean
) {
  const description = useMemo(
    () =>
      sample([
        `met ${useFirstPerson ? "your" : "their"} untimely demise`,
        "passed away",
        `${useFirstPerson ? "are" : "is"} gone too soon`,
      ]),
    []
  );

  const extra: string = (() => {
    if (deathReason === undefined) {
      return "";
    }

    switch (deathReason.kind) {
      case "unknown":
        return "";
      case "fall":
        return `by falling ${deathReason.distance.toFixed(0)}m`;
      case "attack":
        return `from being attacked by ${deathReason.attacker}`;
      case "suicide":
        return `after falling asleep`;
      case "drown":
        return "from drinking too much water";
      case "fire":
        return "from playing with fire";
      case "despawnWand":
        return "from being zapped by an admin";
      case "block": {
        const block = getBiscuit(deathReason.biscuitId);
        return `from dancing on ${block?.displayName || "UNKNOWN"}`;
      }
    }
  })();

  return `${description} ${extra}`;
}

export const DeathMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: DeathMessage;
}> = ({ message, envelope }) => {
  if (!envelope.from) {
    // Don't support server-side emotes yet
    return <></>;
  }

  return (
    <div className="message death center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} />
        </span>{" "}
        {makeDeathReason(message.deathReason)}
      </div>
    </div>
  );
};
