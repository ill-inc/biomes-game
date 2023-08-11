import type {
  MiniPhoneContextType,
  MiniPhoneProps,
} from "@/client/components/system/mini_phone/MiniPhoneContext";
import {
  MiniPhoneContext,
  useNewMiniPhoneContext,
} from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneErrorBoundary } from "@/client/components/system/mini_phone/MiniPhoneErrorBoundaryScreen";
import type { Transition, Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import { last, take } from "lodash";
import type { PropsWithChildren } from "react";
import { useCallback, useLayoutEffect } from "react";

export const MiniPhone = <PayloadT,>({
  renderPayload,
  displayType,
  existingContext,
  onClose,
  children,
}: PropsWithChildren<MiniPhoneProps<PayloadT>>) => {
  const context = existingContext ?? useNewMiniPhoneContext<PayloadT>(onClose);
  const current = last(context.screenStack) as any;

  if (!current) {
    return (
      <MiniPhoneContext.Provider
        value={context as MiniPhoneContextType<unknown>}
      >
        <div>Empty stack! </div>;
      </MiniPhoneContext.Provider>
    );
  }

  useLayoutEffect(() => {
    if (context.desiredAction === "pop") {
      context.setScreenStack([
        ...take(context.screenStack, context.screenStack.length - 1),
      ]);
      context.setDesiredAction(undefined);
    }
  }, [context.desiredAction]);

  const getScreenState = useCallback(
    (i: number) => {
      switch (i) {
        case context.screenStack.length - 1:
          return "topScreen";
        case context.screenStack.length - 2:
          return "buriedScreen"; //maybe prior-top-screen
        default:
          return "buriedScreen";
      }
    },
    [context.screenStack.length]
  );

  const variants: Variants = {
    buriedScreen: { opacity: 0, x: "-10vmin", pointerEvents: "none" },
    topScreen: { opacity: 1, x: 0 },
    exit: { x: "10vmin", opacity: 0 },
  };

  let miniphoneVariants: Variants = {};
  let transition: Transition = {};
  if (displayType === "sign" || displayType === "robot_transmission") {
    miniphoneVariants = {
      initial: {
        y: "10%",
        opacity: 0.5,
      },
      animate: {
        y: "0%",
        opacity: 1,
      },
      exit: {
        opacity: 0.9,
      },
    };

    transition = {
      type: "spring",
      damping: 15,
      mass: 1,
      stiffness: 150,
    };
  }

  return (
    <MiniPhoneContext.Provider value={context as MiniPhoneContextType<unknown>}>
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-black/50"></div>
      <motion.div
        variants={miniphoneVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        className={`biomes-box mini-phone ${displayType.replace(
          "_",
          "-"
        )} ${current.type.replace("_", "-")}`}
      >
        <MiniPhoneErrorBoundary>
          <AnimatePresence initial={false}>
            {context.screenStack.map((payload, i) => {
              return (
                <motion.div
                  initial="exit"
                  animate={getScreenState(i)}
                  exit="exit"
                  variants={variants}
                  key={`screen-wrap-${i}`}
                  className="mini-phone-screen-wrap"
                  transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                >
                  {renderPayload(payload)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </MiniPhoneErrorBoundary>
      </motion.div>
      {children}
    </MiniPhoneContext.Provider>
  );
};
