import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  DROWN_DELAY_IN_TICKS,
  MILLISECONDS_PER_TICK,
} from "@/client/game/scripts/player";
import { useAnimation } from "@/client/util/animation";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { ReadonlyHealth } from "@/shared/ecs/gen/components";
import { motion, useMotionValue } from "framer-motion";
import React, { useEffect, useState } from "react";

export const ProgressBar: React.FunctionComponent<{
  progress: number;
}> = ({ progress }) => {
  const width = `${progress * 100}%`;

  return (
    <div className={`progress-bar-container biomes-box`}>
      <div className="progress-bar">
        <motion.div
          className="progress-bar-fill"
          animate={{ width: width }}
          style={{
            width: width,
          }}
        />
      </div>
    </div>
  );
};

// Breath during in seconds.
const DEFAULT_BREATH_DURATION =
  (DROWN_DELAY_IN_TICKS * MILLISECONDS_PER_TICK) / 1000;

export const HealthBarHUD: React.FunctionComponent<{
  health: ReadonlyHealth;
  type?: "normal" | "underwater";
  flash?: boolean;
}> = ({ health, type = "normal", flash = true }) => {
  const { reactResources } = useClientContext();

  const [lastKnownHealth, setLastKnownHealth] = useState(health.hp);
  const [flashing, setFlashing] = useState(false);
  const [increasing, setIncreasing] = useState(false);
  const flashTime = 450;
  const [mainBarTransitionDuration, setMainBarTransitionDuration] =
    useState("0");
  const [bgBarTransitionDuration, setBgBarTransitionDuration] = useState("0");

  const tweaks = reactResources.use("/tweaks");
  const healthRegenTickTime: string =
    tweaks.healthRegenTickTimeS.toString() + "s";

  const percentage = health.hp / health.maxHp;
  const scaleX = useMotionValue(0);
  const [breathExpirationTime, setBreathExpirationTime] = useState<number>();

  useEffect(() => {
    if (type !== "underwater") {
      setBreathExpirationTime(undefined);
      return;
    }

    setBreathExpirationTime(secondsSinceEpoch() + DEFAULT_BREATH_DURATION);
  }, [type]);

  useAnimation(() => {
    if (!breathExpirationTime) {
      // Player can breath.
      scaleX.set(1);
    } else {
      const remaining = breathExpirationTime - secondsSinceEpoch();
      scaleX.set(Math.max(0, remaining / DEFAULT_BREATH_DURATION));
    }
  });

  useEffect(() => {
    if (!flash) {
      return;
    }
    if (health.hp < lastKnownHealth) {
      setFlashing(true);
      setIncreasing(false);
      setMainBarTransitionDuration("0s");
      setBgBarTransitionDuration("500ms");

      setTimeout(() => {
        setFlashing(false);
      }, flashTime);
    } else {
      setIncreasing(true);
      setMainBarTransitionDuration(healthRegenTickTime);
      setBgBarTransitionDuration(healthRegenTickTime);
    }
    setLastKnownHealth(health.hp);
  }, [health.hp, flash]);

  let healthClass = "full";
  if (percentage < 0.25) {
    healthClass = "one-quarter";
  } else if (percentage < 0.5) {
    healthClass = "half";
  } else if (percentage < 0.75) {
    healthClass = "three-quarters";
  }

  const width = `${percentage * 100}%`;

  // Extra notches for HP > 100
  const notchSpacing = 100 / health.maxHp / 4;
  const numNotches = Math.ceil((health.maxHp / 100) * 4) - 1;

  return (
    <div>
      {type === "underwater" && (
        <div
          className={`health-bar-container biomes-box full underwater health-breath-bar`}
        >
          <div className="health-bar relative">
            <motion.div
              className="health-bar-fill underwater w-full duration-[100ms]"
              style={{ scaleX, transformOrigin: "left" }}
              transition={{ duration: 0.01 }}
            />
          </div>
        </div>
      )}

      <div
        className={`health-bar-container biomes-box ${healthClass} normal ${
          flashing ? "flash" : ""
        }
      ${increasing ? "increasing" : ""}`}
      >
        <div className="health-bar relative">
          <div
            className="health-bar-fill-bg"
            style={{
              width: width,
              transitionDuration: bgBarTransitionDuration,
            }}
          />
          <div
            className="health-bar-fill"
            style={{
              width: width,
              transitionDuration: mainBarTransitionDuration,
            }}
          />
          <div className="notches">
            {Array.from(Array(numNotches).keys()).map((i) => (
              <div
                key={i}
                className="notch"
                style={{ margin: `0 0 0 ${notchSpacing * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
