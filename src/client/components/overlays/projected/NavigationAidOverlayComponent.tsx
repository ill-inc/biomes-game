import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { NavigationAidCircleMarkerIconSize } from "@/client/components/map/markers/NavigationAidCircleMarker";
import { NavigationAidCircleMarkerIcon } from "@/client/components/map/markers/NavigationAidCircleMarker";
import { overlayProjectionParams } from "@/client/components/overlays/projected/helpers";
import {
  navAidDistance,
  QUEST_PRECISE_MIN_RENDER_DISTANCE,
  useAccurateNavigationAidPosition,
} from "@/client/game/helpers/navigation_aids";
import type { NavigationAidOverlay } from "@/client/game/resources/overlays";
import { useAnimation } from "@/client/util/animation";
import { getBiscuit } from "@/shared/bikkie/active";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { motion } from "framer-motion";
import React, { useRef, useState } from "react";

const DistanceDisplay: React.FunctionComponent<{
  overlay: NavigationAidOverlay;
  accuratePosition?: ReadonlyVec3;
}> = ({ overlay, accuratePosition }) => {
  const { reactResources } = useClientContext();
  const divRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useAnimation(() => {
    if (!divRef.current) {
      return;
    }

    const player = reactResources.get("/scene/local_player");

    const distance = navAidDistance(
      overlay.aid,
      player.player.position,
      accuratePosition
    );

    const visible = distance >= QUEST_PRECISE_MIN_RENDER_DISTANCE;
    setVisible(visible);

    if (visible) {
      divRef.current.textContent = `${distance.toFixed(0)}m`;
    }
  });

  return (
    <motion.div
      animate={{
        opacity: visible ? 1 : 0,
      }}
      ref={divRef}
    />
  );
};

export const NavigationAidOverlayComponent: React.FunctionComponent<{
  overlay: NavigationAidOverlay;
}> = React.memo(({ overlay }) => {
  const clientContext = useClientContext();
  const { reactResources } = clientContext;
  const [navAidSize, setNavAidSize] =
    useState<NavigationAidCircleMarkerIconSize>("small");

  const positionedDiv = useRef<HTMLDivElement>(null);
  const accuratePosition = useAccurateNavigationAidPosition(
    clientContext,
    overlay.aid
  );

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

    const distance = navAidDistance(
      overlay.aid,
      player.player.position,
      accuratePosition
    );

    const navAidSize =
      distance < QUEST_PRECISE_MIN_RENDER_DISTANCE ? "large" : "small";

    setNavAidSize(navAidSize);

    const { scale, x, y, zIndex } = overlayProjectionParams(
      proj,
      navAidSize !== "large"
    );

    positionedDiv.current.style.display = "";
    positionedDiv.current.style.zIndex = String(zIndex);
    positionedDiv.current.style.transform = `translateX(-50%) translateY(-50%) translate(${x}px, ${y}px) scale(${scale})`;
    positionedDiv.current.style.opacity =
      overlay.isOccluded && distance < QUEST_PRECISE_MIN_RENDER_DISTANCE
        ? ".4"
        : "1";
  });

  const challenge = getBiscuit(overlay.aid.challengeId);

  return (
    <div
      className={`gap-0.5vmin transform-origin-center text-s fixed left-0 top-0 flex flex-col items-center text-center text-shadow-bordered  ${
        challenge && !challenge.isSideQuest ? "text-orange" : "text-white"
      }`}
      ref={positionedDiv}
      style={{
        willChange: "transform",
      }}
    >
      <NavigationAidCircleMarkerIcon
        size={navAidSize}
        navigationAid={overlay.aid}
      />
      <DistanceDisplay overlay={overlay} accuratePosition={accuratePosition} />
    </div>
  );
});
