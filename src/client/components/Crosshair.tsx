import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useAnimation } from "@/client/util/animation";
import type { Transition, Variants } from "framer-motion";
import { motion } from "framer-motion";
import React, { useState } from "react";

function useCrosshairStyle() {
  const { reactResources } = useClientContext();
  const [crosshairStyle, setCrosshairStyle] = useState<
    "default" | "notAllowed" | "attack" | "none"
  >("default");

  useAnimation(() => {
    const selection = reactResources.get("/hotbar/selection");
    const player = reactResources.get("/scene/local_player");
    const { attackableEntities } = reactResources.get("/scene/cursor");
    const canAttack = attackableEntities.length > 0;
    if (
      (player.fishingInfo && player.fishingInfo?.state === "charging_cast") ||
      player.fishingInfo?.state === "waiting_for_bite" ||
      player.fishingInfo?.state === "bite" ||
      player.fishingInfo?.state === "casting" ||
      player.fishingInfo?.state === "catching" ||
      player.fishingInfo?.state === "caught_reeling_in" ||
      selection.kind === "camera"
    ) {
      setCrosshairStyle("none");
    } else if (canAttack) {
      setCrosshairStyle("attack");
    } else {
      setCrosshairStyle("default");
    }
  });

  return crosshairStyle;
}

export const Crosshair: React.FunctionComponent<{}> = React.memo(({}) => {
  const crosshairStyle = useCrosshairStyle();
  const transition: Transition = {
    type: "spring",
    damping: 15,
    stiffness: 130,
  };

  const crosshairContainerVariants: Variants = {
    default: { rotateZ: "0deg" },
    notAllowed: { rotateZ: "-45deg" },
    attack: { rotateZ: "0deg" },
  };

  const crosshairOneVariants: Variants = {
    default: {
      width: "8px",
      height: "8px",
      x: "-50%",
      y: "-50%",
    },
    notAllowed: {
      width: "12px",
      height: "2px",
      x: "-50%",
      y: "-50%",
    },
    attack: {
      width: "6px",
      height: "2px",
      x: "-160%",
      y: "-50%",
    },
  };

  const crosshairTwoVariants: Variants = {
    default: {
      height: "8px",
      width: "8px",
      x: "-50%",
      y: "-50%",
    },
    notAllowed: {
      width: "2px",
      height: "12px",
      x: "-50%",
      y: "-50%",
    },
    attack: {
      width: "2px",
      height: "6px",
      x: "-50%",
      y: "-160%",
    },
  };

  const crosshairThreeVariants: Variants = {
    default: {
      height: "8px",
      width: "8px",
      x: "-50%",
      y: "-50%",
    },
    notAllowed: {
      width: "2px",
      height: "12px",
      x: "-50%",
      y: "-50%",
    },
    attack: {
      width: "2px",
      height: "6px",
      x: "-50%",
      y: "60%",
    },
  };

  const crosshairFourVariants: Variants = {
    default: {
      height: "8px",
      width: "8px",
      x: "-50%",
      y: "-50%",
    },
    notAllowed: {
      width: "12px",
      height: "2px",
      x: "-50%",
      y: "-50%",
    },
    attack: {
      width: "6px",
      height: "2px",
      x: "60%",
      y: "-50%",
    },
  };

  const attackCircleVariant: Variants = {
    default: { scale: 0, x: "-50%", y: "-50%" },
    notAllowed: { scale: 0, x: "-50%", y: "-50%" },
    attack: {
      scale: 1,
      x: "-50%",
      y: "-50%",
    },
  };

  if (crosshairStyle === "none") {
    return <></>;
  }

  return (
    <motion.div
      initial={false}
      animate={crosshairStyle}
      variants={crosshairContainerVariants}
      transition={transition}
      className={`crosshair`}
    >
      <motion.div
        variants={crosshairOneVariants}
        transition={transition}
        className="one"
      />
      <motion.div
        variants={crosshairTwoVariants}
        transition={transition}
        className="two"
      />
      <motion.div
        variants={crosshairThreeVariants}
        transition={transition}
        className="three"
      />

      <motion.div
        variants={crosshairFourVariants}
        transition={transition}
        className="four"
      />

      <motion.div
        style={{
          position: "absolute",
          border: "2px solid white",
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          width: "16px",
          height: "16px",
        }}
        variants={attackCircleVariant}
        transition={transition}
        className="attackCircle"
      />
    </motion.div>
  );
});
