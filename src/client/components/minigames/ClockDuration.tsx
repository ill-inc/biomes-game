import { durationToClockFormat } from "@/client/util/text_helpers";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { useAnimationFrame } from "framer-motion";
import { useEffect, useState } from "react";

export const ClockDuration: React.FunctionComponent<{ startTime: number }> = ({
  startTime,
}) => {
  const [startSeconds, setStartSeconds] = useState(0);

  useEffect(() => {
    setStartSeconds(secondsSinceEpoch());
  }, []);
  const [playDurationMs, setPlayDurationMs] = useState(0);

  useAnimationFrame((time) => {
    const durationSinceCallbackStart = time / 1000;
    setPlayDurationMs(
      1000 * (startSeconds + durationSinceCallbackStart - startTime)
    );
  });

  return <>{durationToClockFormat(playDurationMs)}</>;
};

export const ClockDurationEndTime: React.FunctionComponent<{
  endTime: number;
}> = ({ endTime }) => {
  const [playDurationMs, setPlayDurationMs] = useState(0);

  useAnimationFrame(() => {
    setPlayDurationMs(1000 * Math.max(endTime - secondsSinceEpoch(), 0));
  });

  return <>{durationToClockFormat(playDurationMs, false)}</>;
};
