import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  NavigationAidAsset,
  worldToMinimapClippedCanvasCoordinates,
} from "@/client/components/map/helpers";
import { MiniMapContext } from "@/client/components/map/MiniMap";
import type { NavigationAid } from "@/client/game/helpers/navigation_aids";
import { navigationAidMiniMapShouldPin } from "@/client/game/helpers/navigation_aids";
import { useAnimation } from "@/client/util/animation";
import { yaw } from "@/shared/math/linear";
import { filterMap, mapMap } from "@/shared/util/collections";
import { ok } from "assert";
import React, { useContext, useRef, useState } from "react";

const MiniMapNavigationAidMarker: React.FunctionComponent<{
  navigationAid: NavigationAid;
}> = React.memo(({ navigationAid }) => {
  const { map, zoomRef } = useContext(MiniMapContext);
  ok(map);
  const { reactResources, mapManager } = useClientContext();
  const positionElementRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  const [tracked] = mapManager.react.useTrackingQuestStatus(
    navigationAid.challengeId
  );

  useAnimation(() => {
    const player = reactResources.get("/scene/local_player");
    const camera = reactResources.get("/scene/camera");
    const orientation = -yaw(camera.view());
    const inset = 0;

    const maxDist = map.clientWidth / 2 - inset;
    const [x, y, clipped] = worldToMinimapClippedCanvasCoordinates(
      maxDist,
      navigationAid.pos,
      player,
      zoomRef.current,
      map.offsetWidth ?? 0,
      map.offsetHeight ?? 0
    );

    if (positionElementRef.current) {
      positionElementRef.current.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${orientation}rad)`;
    }
    setClipped(clipped);
  });

  if (
    !map ||
    (clipped && !navigationAidMiniMapShouldPin(navigationAid, tracked))
  ) {
    return <></>;
  }

  const size = navigationAid.kind === "placed" ? "w-2.5" : "w-3";

  return (
    <div
      key={navigationAid.id}
      className={`absolute ${navigationAid.kind} ${tracked ? "tracked" : ""}`}
      ref={positionElementRef}
      style={{
        zIndex: "1",
        top: 0,
        left: 0,
        willChange: "transform",
      }}
    >
      <NavigationAidAsset
        navigationAid={navigationAid}
        extraClassName={`${size}`}
        includeBalloon={false}
      />
    </div>
  );
});

export const MiniMapNavigationAidMarkers: React.FunctionComponent<{}> =
  React.memo(({}) => {
    const { mapManager } = useClientContext();
    const allNavAids = mapManager.react.useNavigationAids();
    const navAids = filterMap(
      allNavAids,
      (navAid) => navAid.target.kind !== "robot"
    );
    const { map } = useContext(MiniMapContext);

    if (!map) {
      return <></>;
    }

    return (
      <>
        {mapMap(navAids, (data) => (
          <MiniMapNavigationAidMarker navigationAid={data} key={data.id} />
        ))}
      </>
    );
  });
