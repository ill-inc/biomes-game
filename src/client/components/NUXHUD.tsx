import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  NO_RENDER_STATES,
  NUXStateRender,
} from "@/client/components/nux/NUXStateRender";
import type { ActiveNUX } from "@/client/game/resources/nuxes";
import type { NUXES } from "@/client/util/nux/state_machines";
import type { Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import { clone, includes } from "lodash";
import type { PropsWithChildren } from "react";
import React, { useEffect, useRef, useState } from "react";

export const AnimatedNUXToast: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const { reactResources } = useClientContext();
  const modal = reactResources.use("/game_modal");
  const modalUp = modal.kind !== "empty" && modal.kind != "tabbed_pause";
  const variants: Variants = {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  const placement = modalUp ? "top" : "bottom";

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`nux-container biomes-box nux-container-${placement} `}
    >
      <div className="nux-item">
        <div className="nux-inner">{children}</div>
      </div>
    </motion.div>
  );
};

function firstValidNUX(nuxes: ActiveNUX[]) {
  for (const nux of nuxes) {
    if (includes(NO_RENDER_STATES[nux.nuxId as NUXES] ?? [], nux.stateId)) {
      continue;
    }

    return nux;
  }

  return undefined;
}

export const NUXHUD: React.FunctionComponent<{}> = ({}) => {
  const context = useClientContext();
  const [activeNUX, setActiveNUX] = useState<ActiveNUX | undefined>(undefined);
  const lastChange = useRef(0);

  context.reactResources.use("/nuxes/state_active"); // for side effect

  // There is a nasty framer motion bug with AnimatePresence where if you change too
  // quickly it will get stuck in the DOM. As a workaround, I'm delaying updates to have a min
  // time in between
  const workAroundQuickChangeFramerBug = 1000;
  useEffect(() => {
    const toSet = clone(
      firstValidNUX(context.reactResources.get("/nuxes/state_active").value)
    );
    if (
      performance.now() - lastChange.current <
      workAroundQuickChangeFramerBug
    ) {
      const t = setTimeout(() => {
        setActiveNUX(toSet);
        lastChange.current = performance.now();
      }, workAroundQuickChangeFramerBug);

      return () => {
        clearTimeout(t);
      };
    } else {
      setActiveNUX(toSet);
      lastChange.current = performance.now();
    }
  }, [context.reactResources.version("/nuxes/state_active")]);

  return (
    <AnimatePresence mode="wait">
      {activeNUX && (
        <AnimatedNUXToast key={`${activeNUX.nuxId}${activeNUX.stateId}`}>
          <NUXStateRender nuxId={activeNUX.nuxId} stateId={activeNUX.stateId} />
        </AnimatedNUXToast>
      )}
    </AnimatePresence>
  );
};
