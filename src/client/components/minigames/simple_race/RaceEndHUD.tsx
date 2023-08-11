import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  invalidateCachedSingleOOBFetch,
  useCachedEntity,
  useLatestAvailableComponents,
} from "@/client/components/hooks/client_hooks";
import { useTopScoreUser } from "@/client/components/minigames/helpers";
import type { GardenHoseEventOfKind } from "@/client/events/api";
import { durationToClockFormat } from "@/client/util/text_helpers";
import { zSimpleRaceSettings } from "@/server/shared/minigames/simple_race/types";
import { parseMinigameSettings } from "@/server/shared/minigames/type_utils";
import { fireAndForget } from "@/shared/util/async";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { useEffect } from "react";
import raceStarFilled from "/public/hud/race-star-filled.png";
import raceStarUnfilled from "/public/hud/race-star-unfilled.png";

export const RaceEndHUD: React.FunctionComponent<{
  event: GardenHoseEventOfKind<"minigame_simple_race_finish">;
}> = ({ event }) => {
  const clientContext = useClientContext();
  const [topScoreValue, _topScoreUser] = useTopScoreUser(event.minigameId);
  const instance = useCachedEntity(event.minigameInstanceId, true);

  useEffect(() => {
    if (!instance?.minigame_instance?.finished) {
      setTimeout(() => {
        fireAndForget(
          invalidateCachedSingleOOBFetch(clientContext, event.minigameId)
        );
      }, 200);
    }
  }, [instance?.minigame_instance?.finished]);

  if (
    instance?.minigame_instance?.state.kind !== "simple_race" ||
    instance?.minigame_instance?.state.finished_at === undefined
  ) {
    return <></>;
  }

  const variants: Variants = {
    initial: { scale: 1.3, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  };

  const starVariants: Variants = {
    initial: { scale: 3, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  };

  const raceTimeSeconds =
    instance.minigame_instance.state.finished_at -
    instance.minigame_instance.state.started_at;

  const minigameId = instance.minigame_instance.minigame_id;
  const [minigameComponent] = useLatestAvailableComponents(
    minigameId,
    "minigame_component"
  );
  const settings = parseMinigameSettings(
    minigameComponent?.minigame_settings,
    zSimpleRaceSettings
  );

  return (
    <div className="minigames-center-hud">
      {topScoreValue && (
        <motion.div
          transition={{ staggerChildren: 0.1 }}
          initial="initial"
          animate="animate"
          exit="exit"
          className="minigame-end-hud"
        >
          <motion.div variants={variants} className="complete">
            Finished!
          </motion.div>

          {settings.twoStarTimeSeconds > 0 &&
            settings.threeStarTimeSeconds > 0 && (
              <motion.div
                variants={variants}
                transition={{ staggerChildren: 0.3, delayChildren: 0.3 }}
                className="flex gap-0"
              >
                <motion.img
                  variants={starVariants}
                  className="w-6"
                  src={raceStarFilled.src}
                />
                <motion.img
                  variants={starVariants}
                  className="w-6"
                  src={
                    raceTimeSeconds < settings.twoStarTimeSeconds
                      ? raceStarFilled.src
                      : raceStarUnfilled.src
                  }
                />
                <motion.img
                  variants={starVariants}
                  className="w-6"
                  src={
                    raceTimeSeconds < settings.threeStarTimeSeconds
                      ? raceStarFilled.src
                      : raceStarUnfilled.src
                  }
                />
              </motion.div>
            )}
          <motion.div variants={variants} className="time-row">
            <div>Your Time</div>
            <div>{durationToClockFormat(1000 * raceTimeSeconds)}</div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
