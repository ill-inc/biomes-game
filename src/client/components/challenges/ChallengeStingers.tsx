import { useChallengeStingerContext } from "@/client/components/challenges/ChallengeStingersContext";
import type { ChallengeStingerBundle } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import type { Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import { first } from "lodash";
import { useEffect, useState } from "react";
import challengeHex from "/public/hud/challenge-hex.svg";

/*
To test:
/admin test notify challenge_unlock
/admin test notify challenge_complete

*/

const ChallengeStinger: React.FunctionComponent<{
  stinger: ChallengeStingerBundle;
  onAnimationComplete: () => unknown;
}> = ({ stinger, onAnimationComplete }) => {
  const [showStinger, setShowStinger] = useState(true);

  const { audioManager } = useClientContext();

  useEffect(() => {
    document.body.classList.add("stinger-showing");
    return () => {
      document.body.classList.remove("stinger-showing");
    };
  }, []);

  useEffect(() => {
    if (stinger.kind == "challenge_complete") {
      audioManager.playSound("challenge_complete");
    }
    setTimeout(() => {
      setShowStinger(false);
      setTimeout(() => {
        onAnimationComplete();
      }, 2000);
    }, 4000);
  }, [stinger]);

  let stingerTitle = "";
  switch (stinger.kind) {
    case "challenge_unlock":
      stingerTitle = "Quest Accepted";
      break;

    case "challenge_complete":
      stingerTitle = "Quest Complete";
      break;
  }

  const variants: Variants = {
    hidden: {},
    shown: {},
  };

  const textContainer: Variants = {
    hidden: {
      width: "0vmin",
      opacity: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
      },
    },
    shown: {
      opacity: 1,
      width: "34vmin",
      transition: {
        delay: 1,
        type: "spring",
        bounce: 0.3,
      },
    },
  };

  const iconContainer: Variants = {
    hidden: {
      opacity: 0,
      scale: 0,
      rotate: 180,
      x: "-50%",
      top: "50%",
      y: "-50%",
      transition: { delay: 0.5 },
    },
    shown: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 1,
        type: "spring",
        bounce: 0.3,
      },
    },
  };

  const icon: Variants = {
    hidden: {
      scale: 0,
      rotate: 45,
      y: "-50%",
      x: "-50%",
      transition: { delay: 0.5 },
    },
    shown: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: 1,
        delay: 0.1,
        type: "spring",
        bounce: 0.3,
      },
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        className={`challenge-stinger ${stinger.kind}`}
        variants={variants}
        initial="hidden"
        animate={showStinger ? "shown" : "hidden"}
        exit="hidden"
      >
        <motion.div
          variants={textContainer}
          className="stinger-container biomes-box"
        >
          <div className="text-container-inner">
            <div className="stinger-title">{stingerTitle}</div>
            <div className="challenge-name">
              {stinger.challenge.biscuit.displayName}
            </div>
          </div>
        </motion.div>
        <motion.div className="challenge-icon" variants={iconContainer}>
          <img className="challenge-hex-inset-shadow" src={challengeHex.src} />

          <motion.div
            variants={icon}
            className="challenge-stinger-icon-wrapper"
          >
            <ItemIcon item={stinger.challenge.biscuit} />
          </motion.div>

          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="inner-stroke"
          >
            <path
              d="M32 2.3094C34.4752 0.880339 37.5248 0.880339 40 2.3094L63.1769 15.6906C65.6521 17.1197 67.1769 19.7607 67.1769 22.6188V49.3812C67.1769 52.2393 65.6521 54.8803 63.1769 56.3094L40 69.6906C37.5248 71.1197 34.4752 71.1197 32 69.6906L8.82308 56.3094C6.34788 54.8803 4.82309 52.2393 4.82309 49.3812V22.6188C4.82309 19.7607 6.34788 17.1197 8.82309 15.6906L32 2.3094Z"
              fill="#63647D"
            />
          </svg>

          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="outer-stroke"
          >
            <path
              d="M32 2.3094C34.4752 0.880339 37.5248 0.880339 40 2.3094L63.1769 15.6906C65.6521 17.1197 67.1769 19.7607 67.1769 22.6188V49.3812C67.1769 52.2393 65.6521 54.8803 63.1769 56.3094L40 69.6906C37.5248 71.1197 34.4752 71.1197 32 69.6906L8.82308 56.3094C6.34788 54.8803 4.82309 52.2393 4.82309 49.3812V22.6188C4.82309 19.7607 6.34788 17.1197 8.82309 15.6906L32 2.3094Z"
              fill="#63647D"
            />
          </svg>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const ChallengeStingers: React.FunctionComponent<{}> = ({}) => {
  const { stingers, markStingerRead } = useChallengeStingerContext();

  const activeStinger = first(stingers);

  if (!activeStinger) {
    return <></>;
  }

  return (
    <div className="challenge-stingers">
      <ChallengeStinger
        key={activeStinger.message.id}
        stinger={activeStinger}
        onAnimationComplete={() => {
          markStingerRead(activeStinger);
        }}
      />
    </div>
  );
};
