import type {
  WakeUpEffect,
  WarpEffect,
  WorldLoadEffect,
} from "@/client/components/canvas_effects";
import { removeCanvasEffectOfId } from "@/client/components/canvas_effects";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useAnimation } from "@/client/util/animation";
import { easeIn, easeInOut, easeOut } from "@/shared/math/easing";
import type { WithId } from "@/shared/util/type_helpers";
import { motion } from "framer-motion";
import React, { useEffect, useLayoutEffect, useRef } from "react";

const WORLD_LOAD_DURATION = 3000;

const WorldLoadEffectRender: React.FunctionComponent<{
  effect: WithId<WorldLoadEffect, string>;
}> = ({ effect }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(performance.now());
  const { resources, reactResources } = useClientContext();
  useLayoutEffect(() => {
    reactResources.set("/canvas_effects/hide_chrome", {
      value: true,
      disableAnimation: true,
    });
    startTime.current = performance.now();

    return () => {
      reactResources.set("/canvas_effects/hide_chrome", {
        value: false,
      });
    };
  }, []);

  useAnimation(() => {
    if (!divRef.current) {
      return;
    }

    const chromeHidden = reactResources.get(
      "/canvas_effects/hide_chrome"
    ).value;
    const s = easeInOut(
      Math.min(
        1.0,
        (performance.now() - startTime.current) / WORLD_LOAD_DURATION
      )
    );
    if (s >= 0.85 && chromeHidden) {
      reactResources.set("/canvas_effects/hide_chrome", {
        value: false,
      });
    }
    if (s >= 1) {
      divRef.current.style.backdropFilter = "";
      effect.onComplete?.();
      removeCanvasEffectOfId(resources, effect.id);
      return;
    }

    divRef.current.style.backdropFilter = `blur(${10 * (1 - s)}px) brightness(${
      1 + 10 * (1 - s)
    })`;
  });
  return (
    <div
      className="canvas-effects"
      ref={divRef}
      style={{
        willChange: "backdrop-filter",
      }}
    ></div>
  );
};

const BlackAndWhiteEffectRender: React.FunctionComponent<{}> = ({}) => {
  return (
    <div
      className="canvas-effects"
      style={{ backdropFilter: "grayscale(100%)" }}
    ></div>
  );
};

const WarpStartEffectRender: React.FunctionComponent<{
  effect: WithId<WarpEffect, string>;
}> = ({ effect }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const { reactResources, resources } = useClientContext();
  const flashDuration = 500;
  useEffect(() => {
    reactResources.set("/canvas_effects/hide_chrome", {
      value: true,
    });

    return () => {
      reactResources.set("/canvas_effects/hide_chrome", {
        value: false,
      });
    };
  }, []);

  useAnimation(() => {
    if (!divRef.current) {
      return;
    }

    if (effect.substate === "beginning") {
      const s = easeIn(
        Math.min((performance.now() - effect.substateTime) / flashDuration, 1.0)
      );
      if (s >= 1.0 && !effect.hasFiredBeginningFinished) {
        effect.onBeginningFinished();
        effect.hasFiredBeginningFinished = true;
      }
      divRef.current.style.backdropFilter = `blur(${10 * s}px) brightness(${
        1 + 20 * s
      }) ${effect.fromBw ? "grayscale(100%)" : ""}`;
    } else {
      const s = easeOut(
        Math.min((performance.now() - effect.substateTime) / flashDuration, 1.0)
      );
      const chromeHidden = reactResources.get(
        "/canvas_effects/hide_chrome"
      ).value;
      if (s >= 0.85 && chromeHidden) {
        reactResources.set("/canvas_effects/hide_chrome", {
          value: false,
        });
      }
      if (s >= 1) {
        // On complete
        removeCanvasEffectOfId(resources, effect.id);
        return;
      }

      const bw = effect.fromBw ? `grayscale(${100 * (1 - s)}%)` : "";
      divRef.current.style.backdropFilter = `blur(${
        20 * (1 - s)
      }px) brightness(${1 + 10 * (1 - s)}) ${bw}`;
    }
  });
  return (
    <div
      className="canvas-effects"
      ref={divRef}
      style={{
        willChange: "backdrop-filter",
      }}
    ></div>
  );
};

const BlinkingWakeUpEffectRender: React.FunctionComponent<{
  effect: WithId<WakeUpEffect, string>;
}> = ({ effect }) => {
  const { resources, reactResources } = useClientContext();
  const divRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(performance.now());
  const burnDuration = 4000;
  useLayoutEffect(() => {
    reactResources.set("/canvas_effects/hide_chrome", {
      value: true,
      disableAnimation: true,
    });
    startTime.current = performance.now();

    reactResources.update(
      "/scene/camera_effects",
      (e) => (e.startFarPlaneTransition = true)
    );

    return () => {
      reactResources.set("/canvas_effects/hide_chrome", {
        value: false,
      });
    };
  }, []);

  useAnimation(() => {
    if (!divRef.current) {
      return;
    }

    const chromeHidden = reactResources.get(
      "/canvas_effects/hide_chrome"
    ).value;
    const s = easeInOut(
      Math.min(1.0, (performance.now() - startTime.current) / burnDuration)
    );
    if (s >= 0.85 && chromeHidden) {
      reactResources.set("/canvas_effects/hide_chrome", {
        value: false,
      });
    }
    if (s >= 1) {
      divRef.current.style.backdropFilter = "";
      effect.onComplete?.();
      removeCanvasEffectOfId(resources, effect.id);
      return;
    }

    divRef.current.style.backdropFilter = `blur(${10 * (1 - s)}px) brightness(${
      1 + 10 * (1 - s)
    })`;
  });

  const blinkDuration = 2;

  return (
    <div
      className="canvas-effects"
      ref={divRef}
      style={{
        willChange: "backdrop-filter",
      }}
    >
      <motion.div
        className="absolute h-1/2 w-full bg-loading-bg"
        animate={{
          y: ["0%", "-10%", "0%", "-20%", "0%", "-100%"],
        }}
        transition={{
          repeat: Infinity,
          repeatDelay: burnDuration / 1000 - 0.05,
          duration: blinkDuration,
          delay: 0.05,
        }}
        onUpdate={(v) => {
          if (v.y === "-100%") {
            setTimeout(() => {
              startTime.current = performance.now();
            }, burnDuration);
          }
        }}
      ></motion.div>
      <motion.div
        className=" absolute bottom-0 h-1/2 w-full bg-loading-bg"
        animate={{
          y: ["0%", "10%", "0%", "20%", "0%", "100%"],
        }}
        transition={{
          repeat: Infinity,
          repeatDelay: burnDuration / 1000 - 0.05,
          duration: blinkDuration,
          delay: 0.05,
        }}
      ></motion.div>
    </div>
  );
};

export const CanvasEffects: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  const canvasEffect = reactResources.use("/canvas_effect");

  switch (canvasEffect.kind) {
    case "worldLoad":
      return (
        <WorldLoadEffectRender effect={canvasEffect} key={canvasEffect.id} />
      );
    case "wakeUp":
      return (
        <BlinkingWakeUpEffectRender
          effect={canvasEffect}
          key={canvasEffect.id}
        />
      );
    case "bw":
      return <BlackAndWhiteEffectRender key={canvasEffect.id} />;
    case "warp":
      return (
        <WarpStartEffectRender effect={canvasEffect} key={canvasEffect.id} />
      );
    default:
      return <div className="canvas-effects" />;
  }
};
