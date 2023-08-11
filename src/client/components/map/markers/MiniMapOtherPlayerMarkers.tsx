import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  getClientRenderPosition,
  worldToMinimapCanvasCoordinates,
  worldToMinimapClippedCanvasCoordinates,
} from "@/client/components/map/helpers";
import { useNearbyAndTrackedPlayers } from "@/client/components/map/hooks";
import { MiniMapContext } from "@/client/components/map/MiniMap";
import {
  MINI_MAP_HEIGHT,
  MINI_MAP_WIDTH,
} from "@/client/components/MiniMapHUD";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { useAnimation } from "@/client/util/animation";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { yaw } from "@/shared/math/linear";
import { difference } from "lodash";
import type { PropsWithChildren } from "react";
import React, { useContext, useRef } from "react";

const MiniMapOtherPlayerMarker: React.FunctionComponent<{
  playerId: BiomesId;
  clipToEdge?: boolean;
}> = React.memo(({ playerId, clipToEdge }) => {
  const { map, zoomRef } = useContext(MiniMapContext)!;
  const clientContext = useClientContext();
  const { reactResources, mapManager, socialManager, resources } =
    clientContext;
  const bundle = useCachedUserInfo(socialManager, playerId);
  const iconElementRef = useRef<HTMLDivElement>(null);
  if (!map) {
    return <></>;
  }

  useAnimation(() => {
    if (!iconElementRef.current) {
      return;
    }

    const player = reactResources.get("/scene/local_player");
    const camera = reactResources.get("/scene/camera");
    const position = getClientRenderPosition(resources, playerId);
    const orientation = -yaw(camera.view());
    const [x, y] = clipToEdge
      ? worldToMinimapClippedCanvasCoordinates(
          map.clientWidth / 2,
          position,
          player,
          zoomRef.current,
          map.offsetWidth ?? 0,
          map.offsetHeight ?? 0
        )
      : worldToMinimapCanvasCoordinates(
          position,
          player,
          zoomRef.current,
          map.offsetWidth ?? 0,
          map.offsetHeight ?? 0
        );

    iconElementRef.current.style.transform = `translateX(-50%) translateY(-50%) translate(${x}px, ${y}px) rotate(${orientation}rad)`;
  });

  return (
    <div
      className={`PM absolute inset-0 ${MINI_MAP_HEIGHT} ${MINI_MAP_WIDTH} rounded-full`}
      style={{
        overflow: clipToEdge ? "visible" : "hidden",
      }}
    >
      <div
        className={`absolute h-[1.25vmin] w-[1.25vmin]`}
        ref={iconElementRef}
        style={{
          left: 0,
          top: 0,
          willChange: "transform",
        }}
      >
        <EntityProfilePic
          extraClassName={`h-[1.25vmin] w-[1.25vmin] bg-tooltip-bg ${
            mapManager.isTrackingPlayer(playerId)
              ? "mini-map-avatar-shadow-beamed"
              : "mini-map-avatar-shadow"
          }`}
          entityId={bundle?.user.id ?? INVALID_BIOMES_ID}
        />
      </div>
    </div>
  );
});

export const MiniMapMarkersContainer: React.FunctionComponent<
  PropsWithChildren<{ overflow: "hidden" | "visible" }>
> = ({ overflow, children }) => {
  return (
    <div
      className={`absolute inset-0 ${MINI_MAP_HEIGHT} ${MINI_MAP_WIDTH} ${
        overflow === "hidden" ? "overflow-hidden" : "overflow-visible"
      } rounded-full`}
    >
      {children}
    </div>
  );
};

export const MiniMapOtherPlayerMarkers: React.FunctionComponent<{}> = ({}) => {
  const { map } = useContext(MiniMapContext);
  const { userId, mapManager } = useClientContext();
  const markers = useNearbyAndTrackedPlayers((map?.clientWidth ?? 200) * 0.6);

  const trackedMarkers = [...markers].filter((m) => {
    return mapManager.isTrackingPlayer(m);
  });

  return (
    <>
      <MiniMapMarkersContainer overflow="hidden">
        {difference([...markers], [...trackedMarkers]).map((id) => {
          if (id == userId) {
            return undefined;
          }
          return <MiniMapOtherPlayerMarker key={id} playerId={id} />;
        })}
      </MiniMapMarkersContainer>

      <MiniMapMarkersContainer overflow="visible">
        {trackedMarkers.map((id) => {
          if (id == userId) {
            return undefined;
          }
          return (
            <MiniMapOtherPlayerMarker
              key={id}
              playerId={id}
              clipToEdge={true}
            />
          );
        })}
      </MiniMapMarkersContainer>
    </>
  );
};
