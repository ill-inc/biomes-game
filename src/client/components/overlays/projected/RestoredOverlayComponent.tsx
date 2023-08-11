import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useAppliedOverlayPosition } from "@/client/components/overlays/projected/helpers";
import type { RestoredPlaceableOverlay } from "@/client/game/resources/overlays";
import { useInterval } from "@/client/util/intervals";
import { timeString } from "@/shared/util/helpers";
import { clamp } from "lodash";
import React, { useRef, useState } from "react";

const TimeRemainingText: React.FunctionComponent<{
  expiresAt: number;
  createdAt: number;
}> = ({ expiresAt, createdAt }) => {
  const { resources } = useClientContext();

  const tint = "var(--white)";
  const capacity = expiresAt - createdAt;
  const getTimeRemaining = () => {
    const clock = resources.get("/clock");
    return expiresAt ? clamp(expiresAt - clock.time, 0, capacity) : 0;
  };

  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [percentRemaining, setPercentRemaining] = useState(
    (getTimeRemaining() / capacity) * 100
  );

  useInterval(() => {
    const timeRemaining = getTimeRemaining();
    const percentRemaining = (timeRemaining / capacity) * 100;
    setPercentRemaining(percentRemaining);
    setTimeRemaining(timeRemaining);
  }, 500);

  return (
    <div className="flex flex-row-reverse items-center gap-0.1">
      <div
        className={`relative flex h-0.8 w-0.2 items-center overflow-hidden rounded-r-[1vmin] bg-black`}
        style={{
          boxShadow: `0 0 0 0.2vmin rgb(0,0,0)`,
        }}
      />
      <div
        className={`relative flex h-[2vmin] w-4 items-center overflow-hidden rounded-[0.6vmin] bg-tooltip-bg`}
        style={{
          boxShadow: `0 0 0 0.2vmin rgb(0,0,0)`,
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${percentRemaining}%`,
            background: tint,
            boxShadow: "inset 0 0 0 0.2vmin rgba(255,255,255,.5)",
          }}
        />
        <div className="absolute left-0.4 mt-[1px] flex items-center text-sm text-white mix-blend-exclusion text-shadow-[none]">
          {timeString(timeRemaining)}
        </div>
      </div>
    </div>
  );
};

export const RestoredOverlayComponent: React.FunctionComponent<{
  overlay: RestoredPlaceableOverlay;
}> = React.memo(({ overlay }) => {
  const positionedDiv = useRef<HTMLDivElement>(null);
  useAppliedOverlayPosition(positionedDiv, overlay.key);

  return (
    <div
      className={`gap-0.5vmin transform-origin-center fixed left-0 top-0 flex flex-col items-center text-center text-[3vmin] text-shadow-bordered`}
      ref={positionedDiv}
      style={{
        willChange: "transform",
      }}
    >
      <TimeRemainingText
        createdAt={overlay.entity.created_by?.created_at ?? 0}
        expiresAt={overlay.entity?.restores_to?.trigger_at ?? 0}
      />
    </div>
  );
});
