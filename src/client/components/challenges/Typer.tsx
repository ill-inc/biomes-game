import { findHighlights } from "@/client/components/challenges/helpers";
import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

export const Typer: React.FunctionComponent<{
  string: string;
  extraClassNames?: string;
  onTypeComplete: () => void;
  beginTyping: boolean;
  shouldFinishTyping: boolean;
}> = ({
  string,
  extraClassNames,
  onTypeComplete,
  beginTyping,
  shouldFinishTyping,
}) => {
  const TYPE_SPEED = 0.015;
  const [letters, highlitLetterIndices] = findHighlights(Array.from(string));

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
    hidden: { visibility: "hidden" },
    visible: (i) => ({
      visibility: "visible",
      transition: { duration: 0, delay: i * TYPE_SPEED },
    }),
  };
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={controls}
      className={`select-none ${extraClassNames}`}
      onAnimationComplete={() => {
        onTypeComplete?.();
      }}
    >
      {letters.map((letter, i) => (
        <motion.span
          variants={lettersVariants}
          custom={i}
          key={`typer-letter-${i}`}
          className={highlitLetterIndices.includes(i) ? "text-yellow" : ""}
        >
          {letter}
        </motion.span>
      ))}
    </motion.div>
  );
};
