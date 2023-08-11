import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  useCurrentLandName,
  useCurrentLandTeamName,
} from "@/client/util/location_helpers";
import type { Variants } from "framer-motion";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import React, { useEffect, useState } from "react";

const LocationNameTyper: React.FunctionComponent<{
  string: string;
  extraClassNames?: string;
  onTypeComplete: () => void;
  beginTyping: boolean;
  shouldFinishTyping: boolean;
}> = React.memo(
  ({
    string,
    extraClassNames,
    onTypeComplete,
    beginTyping,
    shouldFinishTyping,
  }) => {
    const letters = string.split("");
    const TYPE_SPEED = 0.3 / letters.length;

    const controls = useAnimation();

    const completeTyping = () => {
      controls.set("visible");
      onTypeComplete();
    };

    useEffect(() => {
      if (shouldFinishTyping) {
        completeTyping();
      }
    }, [shouldFinishTyping]);

    useEffect(() => {
      controls.set("hidden");
      if (beginTyping) {
        void controls.start("visible");
      }
    }, [beginTyping]);

    const containerVariants: Variants = {
      hidden: { visibility: "hidden" },
      visible: {
        visibility: "visible",
      },
    };

    const lettersVariants: Variants = {
      hidden: { opacity: 0 },
      visible: (i) => ({
        opacity: 1,
        transition: { duration: 0.6, delay: i * TYPE_SPEED },
      }),
    };
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={controls}
        className={`whitespace-pre ${extraClassNames}`}
        onAnimationComplete={() => {
          onTypeComplete?.();
        }}
      >
        {letters.map((letter, i) => (
          <motion.span
            variants={lettersVariants}
            custom={i}
            key={`typer-letter-${i}`}
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    );
  }
);
export const LocationNameOverlayComponent: React.FunctionComponent<{}> =
  ({}) => {
    const { reactResources } = useClientContext();
    const becomeNpc = reactResources.use("/scene/npc/become_npc");
    const [hasEnteredNewLocation, setHasEnteredNewLocation] = useState(false);
    const [suppress, setSuppress] = useState(false);
    const locationName = useCurrentLandName();
    const teamName = useCurrentLandTeamName();

    const [previousLocation, setPreviousLocation] = useState<
      string | undefined | null
    >(null);

    useEffect(() => {
      const timeoutMs = locationName ? 3000 : 2000;

      if (previousLocation === null) {
        setPreviousLocation(locationName);
        return;
      }

      setHasEnteredNewLocation(true);

      setSuppress(false);

      const timeout = setTimeout(() => {
        setSuppress(true);
      }, timeoutMs);

      return () => {
        clearTimeout(timeout);
      };
    }, [locationName]);

    if (!hasEnteredNewLocation || becomeNpc.kind === "active") {
      return <></>;
    }

    const variants: Variants = {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
      },
      exit: { opacity: 0, transition: { duration: 0.3 } },
    };

    return (
      <AnimatePresence>
        {!suppress && (
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ staggerChildren: locationName ? 0.1 : 0 }}
            className="fixed left-1/2 top-16 z-[1000] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-[var(--lighter-yellow)] mix-blend-screen"
          >
            <>
              <motion.div className="text-l font-semibold" variants={variants}>
                {teamName && (
                  <LocationNameTyper
                    key="entering"
                    beginTyping={true}
                    onTypeComplete={() => {}}
                    string={`<${teamName}>`}
                    shouldFinishTyping={false}
                  />
                )}
              </motion.div>
              <motion.div
                className={`-mb-0.2 text-[min(5vmin,_32pt)] font-[700]`}
                variants={variants}
              >
                {locationName ? (
                  <LocationNameTyper
                    key={locationName}
                    beginTyping={true}
                    onTypeComplete={() => {}}
                    string={locationName}
                    shouldFinishTyping={false}
                  />
                ) : (
                  <LocationNameTyper
                    key="muck"
                    beginTyping={true}
                    onTypeComplete={() => {}}
                    string={`The Muck`}
                    shouldFinishTyping={false}
                    extraClassNames="text-light-purple"
                  />
                )}
              </motion.div>

              <motion.div className="text-l" variants={variants}>
                {locationName && (
                  <LocationNameTyper
                    key="entering"
                    beginTyping={true}
                    onTypeComplete={() => {}}
                    string={"Protected Area"}
                    shouldFinishTyping={false}
                  />
                )}
              </motion.div>
            </>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };
