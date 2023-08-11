import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { overlayProjectionParams } from "@/client/components/overlays/projected/helpers";
import { placeableDistance } from "@/client/game/helpers/navigation_aids";

import { usePlayingMinigameInfo } from "@/client/components/minigames/helpers";
import type { MinigameElementOverlay } from "@/client/game/resources/overlays";
import { MAX_MINIGAME_OVERLAY_DIST } from "@/client/game/scripts/overlays";
import { useAnimation } from "@/client/util/animation";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ReadonlyPlayingMinigame } from "@/shared/ecs/gen/components";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { AnimatePresence, motion } from "framer-motion";
import React, { useRef } from "react";
import raceFlag from "/public/hud/minigame-race-flag.png";

const MinigameElementOverlayActive: React.FunctionComponent<{
  activeMinigame: ReadonlyPlayingMinigame;
}> = ({ activeMinigame }) => {
  const { instance, minigame } = usePlayingMinigameInfo(
    activeMinigame.minigame_id,
    activeMinigame.minigame_instance_id
  );
  if (
    !instance ||
    instance.state.kind !== "simple_race" ||
    minigame?.minigame_component?.metadata?.kind !== "simple_race"
  ) {
    return <></>;
  }
  return (
    <AnimatePresence>
      <motion.div
        initial={{ filter: "blur(10px)", scale: 0 }}
        animate={{ filter: "blur(0px)", scale: 1 }}
        className="text-[3vmin] text-light-blue"
        style={{ filter: "drop-shadow(0 0 2vmin var(--light-blue))" }}
      >
        {instance.state.player_state === "waiting" ? (
          <>
            Start Race
            <br />
            <div className="mt-1 flex flex-col">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ y: "0%", rotate: "90deg" }}
                  animate={{ y: ["0%", "10%"], opacity: [0.5, 1] }}
                  className="leading-[1vmin]"
                  transition={{
                    repeat: Infinity,
                    repeatType: "mirror",
                    duration: 0.5,
                    delay: i * 0.16,
                    bounce: 0.3,
                    type: "spring",
                  }}
                >
                  ❯
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          ""
        )}{" "}
      </motion.div>
    </AnimatePresence>
  );
};

export const MinigameElementOverlayComponent: React.FunctionComponent<{
  overlay: MinigameElementOverlay;
}> = React.memo(({ overlay }) => {
  const clientContext = useClientContext();
  const { resources, reactResources, userId } = clientContext;

  const positionedDiv = useRef<HTMLDivElement>(null);
  const minigame = useLatestAvailableComponents(
    overlay.minigameId,
    "minigame_component"
  );
  const activeMinigame = reactResources.use("/ecs/c/playing_minigame", userId);

  useAnimation(() => {
    if (!positionedDiv.current) {
      return;
    }

    const player = reactResources.get("/scene/local_player");
    const proj = reactResources.get("/overlays/projection").get(overlay.key);
    if (!proj) {
      positionedDiv.current.style.display = "none";
      return;
    }

    const distance = placeableDistance(overlay.pos, player.player.position);

    const { scale, x, y, zIndex } = overlayProjectionParams(proj, false);

    positionedDiv.current.style.display = "";
    positionedDiv.current.style.zIndex = String(zIndex);
    positionedDiv.current.style.opacity =
      overlay.isOccluded && distance < MAX_MINIGAME_OVERLAY_DIST ? "0.4" : "1";
    positionedDiv.current.style.transform = `translateX(-50%) translateY(-50%) translate(${x}px, ${y}px) scale(${scale})`;
  });

  if (!minigame) {
    return <></>;
  }

  const biscuit = relevantBiscuitForEntityId(resources, overlay.elementId);
  if (!biscuit || biscuit.id !== BikkieIds.simpleRaceStart) return <></>;

  return (
    <div
      className={`gap-0.5vmin transform-origin-center fixed left-0 top-0 flex flex-col items-center text-center text-[3vmin] text-shadow-bordered`}
      ref={positionedDiv}
      style={{
        willChange: "transform",
      }}
    >
      {activeMinigame ? (
        <>
          <MinigameElementOverlayActive activeMinigame={activeMinigame} />
        </>
      ) : (
        <motion.div
          animate={{ y: ["0%", "10%", "0%"] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <img className="h-8 w-8" src={raceFlag.src} />
        </motion.div>
      )}
    </div>
  );
});
