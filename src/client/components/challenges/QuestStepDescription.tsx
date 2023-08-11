import type { TriggerProgress } from "@/client/game/resources/challenges";
import { motion } from "framer-motion";

export const QuestStepDescription: React.FunctionComponent<{
  triggerProgress: TriggerProgress;
  inactive?: boolean;
  className?: string;
}> = ({ triggerProgress, className }) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: "-25%",
      }}
      animate={{
        opacity: triggerProgress.progressPercentage === 1 ? 0.5 : 1,
        x: "0%",
      }}
      exit={{
        opacity: 0,
        x: "15%",
        transition: { opacity: { delay: 1 }, x: { delay: 1 } },
      }}
      className={`${className ? className : ""} ${
        triggerProgress.progressPercentage === 1 ? "line-through" : ""
      }`}
    >
      {triggerProgress.progressString}
    </motion.div>
  );
};
