import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  NavigationAidAsset,
  NavigationAidCircleContext,
} from "@/client/components/map/helpers";
import type { NavigationAid } from "@/client/game/helpers/navigation_aids";
import {
  accurateNavigationAidPosition,
  navAidDistance,
  navigationAidProjectionByKind,
  navigationAidShowsOnCircle,
} from "@/client/game/helpers/navigation_aids";
import { useAnimation } from "@/client/util/animation";
import { getBiscuit } from "@/shared/bikkie/active";
import { pointFromVector } from "@popmotion/popcorn";
import { delay, easeIn, mix } from "framer-motion";
import { isEqual } from "lodash";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import navAidPointerBeam from "/public/hud/nav-aid-pointer-beam.png";
import navAidArrowMainQuest from "/public/hud/nav-aid-pointer-quest-main.png";
import navAidArrowSideQuest from "/public/hud/nav-aid-pointer-quest-side.png";
import navAidBigParticle from "/public/textures/particles/nav-aid-big.png";
import navAidSmallParticle from "/public/textures/particles/nav-aid-small.png";

export type NavigationAidCircleMarkerIconSize = "large" | "small";

function Particle({
  minDuration = 500,
  maxDuration = 5000,
  minDistance = 1,
  maxDistance = 10,
  minSize = 1,
  maxSize = 4,
  index = 0,
  img = "",
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animation: Animation;

    const cancelDelay = delay(() => {
      const angle = Math.random() * (-80 - -100) + -100;
      const distance = mix(minDistance, maxDistance, Math.random());
      const duration = mix(minDuration, maxDuration, Math.random());
      const { x, y } = pointFromVector({ x: 0, y: 0 }, angle, distance);

      if (!ref.current) return;

      animation = ref.current.animate(
        {
          transform: ["none", `translate3d(${x}px, ${y}px, 0)`],
          opacity: [mix(1, 0.6, Math.random()), 0],
          scale: [1, 0.8],
        },
        {
          duration,
          iterations: Infinity,
        }
      );
    }, index * 20);

    return () => {
      cancelDelay();
      animation?.cancel();
    };
  }, []);
  const size = useMemo(() => mix(minSize, maxSize, easeIn(Math.random())), []);
  return (
    <div
      ref={ref}
      className="absolute will-change-transform"
      style={{
        width: `${size}vmin`,
        height: `${size}vmin`,
        top: `calc(50% - ${size / 2}vmin)`,
        left: `calc(50% - ${size / 2}vmin)`,
        opacity: 0,
      }}
    >
      <img src={img} className="h-full w-full" />
    </div>
  );
}

export const NavigationAidCircleMarkerIcon: React.FunctionComponent<{
  navigationAid: NavigationAid;
  size: NavigationAidCircleMarkerIconSize;
}> = ({ navigationAid, size }) => {
  const sizeClasses = size == "large" ? "w-8 h-8" : "w-[2.5vmin] h-[2.5vmin]";
  return (
    <NavigationAidAsset
      extraClassName={sizeClasses}
      navigationAid={navigationAid}
      includeBalloon={true}
    />
  );
};

const NavigationAidCircleParticles: React.FunctionComponent<{
  navigationAid: NavigationAid;
}> = React.memo(({ navigationAid }) => {
  if (navigationAid.kind === "placed") return <></>;

  const numBigParticles = 5;
  const particles = useMemo(() => {
    const output = [];
    for (let i = 0; i < numBigParticles; i++) {
      output.push(
        <Particle
          img={navAidBigParticle.src}
          minSize={2}
          maxSize={4}
          minDistance={30}
          maxDistance={40}
          index={i}
          key={i}
        />
      );
    }

    return output;
  }, [numBigParticles]);

  const numSmallParticles = 5;

  const particles2 = useMemo(() => {
    const output = [];
    for (let i = 0; i < numSmallParticles; i++) {
      output.push(
        <Particle
          img={navAidSmallParticle.src}
          minSize={1}
          maxSize={4}
          minDistance={40}
          maxDistance={50}
          index={i}
          key={i}
        />
      );
    }

    return output;
  }, [numSmallParticles]);

  return (
    <div className="absolute left-1/2 top-1/2 z-[-1] h-full w-full translate-x-[-50%] translate-y-[-50%]">
      {particles}
      {particles2}
    </div>
  );
});

const NavigationAidCircleWithTransform: React.FunctionComponent<{
  navigationAid: NavigationAid;
}> = React.memo(({ navigationAid }) => {
  const { userId, reactResources } = useClientContext();
  const { map } = useContext(NavigationAidCircleContext);
  const transformedDiv = useRef<HTMLDivElement>(null);
  const overlayArrowDiv = useRef<HTMLDivElement>(null);

  useAnimation(() => {
    if (!transformedDiv.current || !overlayArrowDiv.current || !map) {
      return;
    }

    const camera = reactResources.get("/scene/camera");
    const accuratePosition = accurateNavigationAidPosition(
      userId,
      reactResources,
      navigationAid
    );

    // Project the navigation aid to the screen plane.
    const [rotX, rotY] = navigationAidProjectionByKind(
      camera,
      accuratePosition,
      navigationAid.target
    );
    const arrowRotate = Math.atan2(rotY, rotX) + 0.5 * Math.PI;

    const [newX, newY] = [
      map.offsetWidth / 2 + (map.offsetWidth / 2) * rotX,
      map.offsetHeight / 2 + (map.offsetHeight / 2) * rotY,
    ];

    transformedDiv.current.style.transform = `translate(-50%, -50%) translate(${newX}px, ${newY}px)`;
    overlayArrowDiv.current.style.transform = `rotate(${arrowRotate}rad)`;
  });

  const challenge = getBiscuit(navigationAid.challengeId);

  let navAidArrow = navAidPointerBeam.src;
  if (challenge) {
    if (challenge.isSideQuest) {
      navAidArrow = navAidArrowSideQuest.src;
    } else {
      navAidArrow = navAidArrowMainQuest.src;
    }
  }

  return (
    <div
      ref={transformedDiv}
      className="navigation-overlay-marker"
      key={navigationAid.id}
      style={{
        willChange: "transform",
      }}
    >
      <div
        className="navigation-overlay-arrow"
        ref={overlayArrowDiv}
        style={{
          willChange: "transform",
        }}
      >
        <img src={navAidArrow} />
      </div>
      <NavigationAidCircleMarkerIcon
        size="small"
        navigationAid={navigationAid}
      />
      <NavigationAidCircleParticles navigationAid={navigationAid} />
    </div>
  );
}, isEqual);

export const NavigationAidCircleMarker: React.FunctionComponent<{
  navigationAid: NavigationAid;
}> = React.memo(({ navigationAid }) => {
  const { map } = useContext(NavigationAidCircleContext);
  const { userId, reactResources, mapManager } = useClientContext();

  const [visible, setVisible] = useState(false);

  useAnimation(() => {
    const tracked = mapManager.isTrackingQuest(navigationAid.challengeId);
    const overlayMap = reactResources.get("/overlays");
    const player = reactResources.get("/scene/local_player");
    const accuratePosition = accurateNavigationAidPosition(
      userId,
      reactResources,
      navigationAid
    );

    const distance = navAidDistance(
      navigationAid,
      player.player.position,
      accuratePosition
    );

    if (
      !map ||
      !navigationAidShowsOnCircle(navigationAid, tracked, distance) ||
      overlayMap.has(`navigationAid:${navigationAid.id}`) ||
      !accuratePosition
    ) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  });

  return (
    <>
      {visible && (
        <NavigationAidCircleWithTransform navigationAid={navigationAid} />
      )}
    </>
  );
});
