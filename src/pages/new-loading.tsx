import { WakeupMuckParticles } from "@/client/components/Particles";
import type {
  LoadProgress,
  LoadProgressSummary,
} from "@/client/game/load_progress";
import { progressSummary } from "@/client/game/load_progress";
import { motion, useSpring } from "framer-motion";
import { random } from "lodash";
import { useEffect } from "react";
import bLogoImage from "/public/splash/biomes-logo.png";

const Problems: LoadProgressSummary[] = ["broken", "problems_connecting"];
const Steps: LoadProgressSummary[] = [
  "no_progress",
  "no_early_context_loader",
  "early_context",
  "connecting",
  "waiting_for_heartbeat",
  "bootstrapping",
  "game_entities",
  "player_mesh",
  "terrain_meshing",
  "scene_rendered",
  "ready",
];

function progressToPercentage(progress: LoadProgress): number {
  const summary = progress ? progressSummary(progress) : "no_progress";
  if (Problems.includes(summary)) {
    return 0;
  }

  const stepPercentage = (1 / Steps.length) * 100;
  let percentage = Steps.indexOf(summary) * stepPercentage + random(0, 10);
  if (summary === "scene_rendered") {
    percentage += stepPercentage;
  }

  return Math.min(percentage, 100);
}

interface LoadingContentPreviewProps {
  tip: string;
  loadProgress: LoadProgress;
  onToggleDetails: () => void;
  children?: React.ReactNode;
}

export default function LoadingContentPreview({
  tip,
  loadProgress,
  onToggleDetails,
  children,
}: LoadingContentPreviewProps) {
  const scaleX = useSpring(0, {
    bounce: 0,
  });
  useEffect(() => {
    const newPercentage = progressToPercentage(loadProgress);
    // We only want progress going up!
    scaleX.set(Math.max(scaleX.get(), newPercentage / 100));
  }, [loadProgress]);

  return (
    <div className="absolute inset-0 bg-loading-bg">
      <WakeupMuckParticles />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <img
          src={bLogoImage.src}
          className="h-auto w-32 filter-image-drop-shadow"
          style={{ imageRendering: "pixelated" }}
          onDoubleClick={() => onToggleDetails()}
        />
        <div
          className="biomes-box flex h-2 w-32 flex-row overflow-hidden rounded-[0px]"
          style={{ borderRadius: 0 }}
        >
          <motion.div
            className="h-full w-full bg-white"
            style={{
              boxShadow:
                "inset 0 0 0 0.2vmin rgba(255,255,255,0.1), 0 0 0.4vmin 0.1vmin rgba(0,0,0,.2) ",
              transformOrigin: "left",
              scaleX,
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="absolute bottom-0 flex w-full shrink-0 flex-col items-center gap-2 p-4">
          <div className="text-xxl font-semibold text-shadow-drop">{tip}</div>
          {children && <div className="pt-1">{children}</div>}
        </div>
      </div>
    </div>
  );
}
