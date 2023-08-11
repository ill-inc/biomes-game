import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ProfileInfoHUD } from "@/client/components/inventory/ProfileInfoHUD";
import { DeathMatchHUD } from "@/client/components/minigames/deathmatch/DeathmatchHUD";
import { RaceEndHUD } from "@/client/components/minigames/simple_race/RaceEndHUD";
import { RaceHUD } from "@/client/components/minigames/simple_race/RaceHUD";
import { SpleefHUD } from "@/client/components/minigames/spleef/SpleefHUD";
import type { GardenHoseEvent } from "@/client/events/api";
import { cleanEmitterCallback } from "@/client/util/helpers";
import { useStateWithTimeRevert } from "@/client/util/hooks";
import type { ReadonlyPlayingMinigame } from "@/shared/ecs/gen/components";
import { assertNever } from "@/shared/util/type_helpers";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect } from "react";

export const CenterHUD: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, userId, gardenHose, socialManager } =
    useClientContext();
  const activeMinigame = reactResources.use("/ecs/c/playing_minigame", userId);

  const [minigameEnd, setMinigameEnd] = useStateWithTimeRevert<
    GardenHoseEvent | undefined
  >(3_000);

  useEffect(() =>
    cleanEmitterCallback(gardenHose, {
      minigame_simple_race_finish: (v) => {
        socialManager.eagerInvalidateLeaderboard(userId, {
          kind: "race_minigame_time",
          id: v.minigameId,
        });
        setMinigameEnd(v);
      },
    })
  );

  return (
    <div className="center-hud">
      <AnimatePresence>
        {!activeMinigame && minigameEnd && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="minigames-overlay"
          >
            {minigameEnd.kind === "minigame_simple_race_finish" && (
              <RaceEndHUD event={minigameEnd} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TopLeftHUD: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, userId } = useClientContext();
  const activeMinigame = reactResources.use("/ecs/c/playing_minigame", userId);

  return (
    <div className="top-left-hud">
      <AnimatePresence>
        {activeMinigame && (
          <MinigameOverlayForType playingMinigame={activeMinigame} />
        )}
      </AnimatePresence>

      {!activeMinigame && <ProfileInfoHUD />}
    </div>
  );
};

export const MinigameOverlayForType: React.FunctionComponent<{
  playingMinigame: ReadonlyPlayingMinigame;
}> = ({ playingMinigame }) => {
  let view = <></>;
  switch (playingMinigame.minigame_type) {
    case "simple_race":
      view = <RaceHUD playingMinigame={playingMinigame} />;
      break;
    case "deathmatch":
      view = <DeathMatchHUD playingMinigame={playingMinigame} />;
      break;
    case "spleef":
      view = <SpleefHUD playingMinigame={playingMinigame} />;
      break;
    default:
      assertNever(playingMinigame.minigame_type);
  }
  return (
    <motion.div
      initial={{ x: "-10%", opacity: 0 }}
      animate={{ x: "0%", opacity: 1 }}
      exit={{ x: "-10%", opacity: 0 }}
      className="minigame-overlay"
    >
      {view}
    </motion.div>
  );
};
