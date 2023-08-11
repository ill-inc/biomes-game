import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { useCanAffordMinigameEntry } from "@/client/components/minigames/helpers";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { createOrJoinMinigame } from "@/client/game/util/warping";
import {
  absoluteWebServerURL,
  minigamePublicPermalink,
} from "@/server/web/util/urls";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { MinigameJoinMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import { fireAndForget } from "@/shared/util/async";
import { formatCurrency } from "@/shared/util/view_helpers";
import { useState } from "react";

export const MinigameJoinMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: MinigameJoinMessage;
}> = ({ message, envelope }) => {
  if (!envelope.from) {
    return <></>;
  }
  const clientContext = useClientContext();
  const minigame = useCachedEntity(message.minigameId);

  const url = minigame
    ? absoluteWebServerURL(
        minigamePublicPermalink(minigame.id, minigame.label?.text)
      )
    : "";

  const [canAfford, entryPrice] = useCanAffordMinigameEntry(message.minigameId);
  const priceStr = entryPrice
    ? ` for ${formatCurrency(BikkieIds.bling, entryPrice)} Bling`
    : "";

  const [joining, setJoining] = useState(false);

  let tooltipContents = `Play Game${priceStr}`;
  if (joining) {
    tooltipContents = "Joining...";
  } else if (!canAfford) {
    tooltipContents = `You can't afford this game${priceStr}`;
  }

  return (
    <div className="message minigame-join center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} />
        </span>
        {` `}
        {minigame?.minigame_component?.metadata.kind == "simple_race"
          ? "played"
          : "joined"}
        {` `}
        <Tooltipped tooltip={tooltipContents}>
          <a
            href={url}
            onClick={(e) => {
              e.preventDefault();
              if (!minigame || !canAfford) return;
              setJoining(true);
              fireAndForget(
                createOrJoinMinigame(clientContext, minigame.id).finally(() => {
                  setJoining(false);
                })
              );
            }}
          >
            {minigame?.label?.text ?? "Game"}
          </a>
        </Tooltipped>
      </div>
    </div>
  );
};
