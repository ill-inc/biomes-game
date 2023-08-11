import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { useCanAffordMinigameEntry } from "@/client/components/minigames/helpers";
import { Img } from "@/client/components/system/Img";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { createOrJoinMinigame } from "@/client/game/util/warping";
import { BikkieIds } from "@/shared/bikkie/ids";
import { log } from "@/shared/logging";
import type { MinigameDetail } from "@/shared/types";
import { formatCurrency } from "@/shared/util/view_helpers";
import type { PropsWithChildren } from "react";
import React, { useCallback, useState } from "react";
import playIconBordered from "/public/hud/icon-16-play-bordered.png";
import playIcon from "/public/hud/icon-32-play.png";

function actionButtonClassName(disabled?: boolean) {
  let className = `action-button link like-button`;
  if (disabled) {
    className += " disabled";
  }
  return className;
}

export const MinigamePlayButton: React.FunctionComponent<
  PropsWithChildren<{
    buttonType: "inline-chat" | "action";
    minigame: MinigameDetail;
    onJoin?: () => void;
  }>
> = ({ buttonType, minigame, children }) => {
  const pointerLockManager = usePointerLockManager();
  const [playButtonDisabled, setPlayButtonDisabled] = useState(false);
  const clientContext = useClientContext();
  const [canAfford, entryPrice] = useCanAffordMinigameEntry(minigame.id);
  const priceStr = entryPrice
    ? ` for ${formatCurrency(BikkieIds.bling, entryPrice)} Bling`
    : "";

  const doPlay = useCallback(async () => {
    setPlayButtonDisabled(true);
    try {
      await createOrJoinMinigame(clientContext, minigame.id);
      clientContext.reactResources.set("/game_modal", {
        kind: "empty",
      });
      pointerLockManager.focusAndLock();
    } catch (error: any) {
      log.error(error);
    } finally {
      setPlayButtonDisabled(false);
    }
  }, []);

  let imagePayload: JSX.Element | undefined;
  switch (buttonType) {
    case "inline-chat":
      imagePayload = <Img className="play" src={playIconBordered.src} />;
      break;

    case "action":
      imagePayload = <Img className="play" src={playIcon.src} />;
      break;
  }
  const disabled = playButtonDisabled || !canAfford;
  return (
    <Tooltipped
      tooltip={
        !canAfford
          ? `You can't afford this game${priceStr}`
          : `Play ${minigame.label ?? minigame.minigameType}${priceStr}`
      }
    >
      <button
        className={actionButtonClassName(disabled)}
        onClick={(e) => {
          e.preventDefault();
          void doPlay();
        }}
        disabled={disabled}
      >
        {imagePayload}
        {children}
        {buttonType === "inline-chat" && <>Play </>}
      </button>
    </Tooltipped>
  );
};
