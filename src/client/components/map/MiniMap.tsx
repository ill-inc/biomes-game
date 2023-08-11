import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  getMapBrightness,
  mapTileURL,
  mapTileUV,
  worldToMinimapMapCoordinates,
  zoomScale,
} from "@/client/components/map/helpers";
import { MiniMapLocalPlayerMarker } from "@/client/components/map/markers/MiniMapLocalPlayerMarker";
import { MiniMapNavigationAidMarkers } from "@/client/components/map/markers/MiniMapNavigationAidMarkers";
import { MiniMapOtherPlayerMarkers } from "@/client/components/map/markers/MiniMapOtherPlayerMarkers";
import {
  MiniMapLocalPlayerRobotMarker,
  MiniMapOtherRobotMarkers,
} from "@/client/components/map/markers/MiniMapRobotMarkers";
import {
  MINI_MAP_HEIGHT,
  MINI_MAP_WIDTH,
} from "@/client/components/MiniMapHUD";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useAnimation } from "@/client/util/animation";
import { useStateDeepEqual } from "@/client/util/hooks";
import { scale2, sub2, yaw } from "@/shared/math/linear";
import type { Vec2, Vec3 } from "@/shared/math/types";
import type { WorldMapMetadataResponse } from "@/shared/types";
import { uniqueId } from "lodash";
import type { MutableRefObject, PropsWithChildren } from "react";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

export const MiniMapContext = React.createContext<{
  map: HTMLDivElement | null;
  zoom: number;
  zoomRef: MutableRefObject<number>;
}>({ map: null, zoom: 1, zoomRef: { current: 1 } });

interface NearbyMapImage {
  key: string;
  url: string;
  pixelRange: [Vec2, Vec2];
  size: Vec2;
}

type TileInfo = [tileCoordX: number, tileCoordY: number, tileSize: number];

function tileInfoForPlayerPosition(
  data: WorldMapMetadataResponse,
  zoom: number,
  position: Vec3
): TileInfo {
  const [tileCoordX, tileCoordY] = mapTileUV(data.tileSize, position, zoom);
  const tileSize = data.tileSize;
  return [tileCoordX, tileCoordY, tileSize];
}

function useNearbyMapImages(data: WorldMapMetadataResponse, zoom: number) {
  const { reactResources } = useClientContext();

  const [tileInfo, setTileInfo] = useStateDeepEqual(
    tileInfoForPlayerPosition(
      data,
      zoom,
      reactResources.get("/scene/local_player").player.position
    )
  );

  useAnimation(() => {
    const player = reactResources.get("/scene/local_player");
    setTileInfo(tileInfoForPlayerPosition(data, zoom, player.player.position));
  });

  const mapImages = useMemo(() => {
    const ret: NearbyMapImage[] = [];
    const [tileCoordX, tileCoordY, baseTileSize] = tileInfo;
    const tileSize =
      (baseTileSize * zoomScale(zoom)) / zoomScale(Math.floor(zoom));
    const fudgeFactor = 0.5;
    for (let startX = tileCoordX - 1; startX < tileCoordX + 2; startX += 1) {
      for (let startY = tileCoordY - 1; startY < tileCoordY + 2; startY += 1) {
        ret.push({
          key: uniqueId(),
          pixelRange: [
            [startX * tileSize, startY * tileSize],
            [(startX + 1) * tileSize, (startY + 1) * tileSize],
          ],
          size: [tileSize + fudgeFactor, tileSize + fudgeFactor],
          url: mapTileURL(data, "surface", [startX, startY], zoom),
        });
      }
    }
    return ret;
  }, [...tileInfo, data, zoom]);

  return mapImages;
}

export const TiledMapImage: React.FunctionComponent<{
  data: WorldMapMetadataResponse;
}> = ({ data }) => {
  const { reactResources } = useClientContext();
  const divRef = useRef<HTMLDivElement>(null);

  const { zoomRef } = useContext(MiniMapContext);

  const boundsSize = scale2(
    zoomScale(zoomRef.current),
    sub2(data.boundsEnd, data.boundsStart)
  );

  const nearbyMapImages = useNearbyMapImages(data, zoomRef.current);
  useAnimation(() => {
    if (!divRef.current) {
      return;
    }

    const player = reactResources.get("/scene/local_player");
    const [mapX, mapY] = worldToMinimapMapCoordinates(
      player.player.position,
      zoomRef.current
    );
    divRef.current.style.transform = `translate(calc(50% - ${mapX}px), calc(50% - ${mapY}px))`;
  });

  return (
    <div className="map relative h-full w-full overflow-hidden rounded-full">
      <div
        className="h-full w-full"
        ref={divRef}
        style={{
          willChange: "transform",
        }}
      >
        <div
          style={{
            width: boundsSize[0],
            height: boundsSize[1],
            transform: `translate(${data.boundsStart[0]}px, ${data.boundsStart[1]}px)`,
            position: "relative",
          }}
        >
          {nearbyMapImages.map((e) => {
            return (
              <img
                key={e.key}
                src={e.url}
                style={{
                  transform: `translate(${
                    e.pixelRange[0][0] - data.boundsStart[0]
                  }px, ${e.pixelRange[0][1] - data.boundsStart[1]}px)`,
                  width: e.size[0],
                  height: e.size[1],
                  position: "absolute",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PureTiledMapImage = React.memo(TiledMapImage);

export const MiniMap: React.FunctionComponent<PropsWithChildren<{}>> =
  React.memo(({ children }) => {
    const { reactResources, mapManager } = useClientContext();
    const [_, mapData] = mapManager.react.useMapMetadata();
    const dimRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<HTMLDivElement | null>(null);

    const tweaks = reactResources.use("/tweaks");
    const [zoom, trueSetZoom] = useState<number>(
      Math.round(tweaks.minimapZoom)
    );
    const zoomRef = useRef<number>(zoom);
    const setZoom = (newVal: number) => {
      trueSetZoom(newVal);
      zoomRef.current = newVal;
    };

    useEffect(() => {
      setZoom(tweaks.minimapZoom);
    }, [tweaks.minimapZoom]);

    useAnimation(() => {
      const skyParams = reactResources.get("/scene/sky_params");

      const cam = reactResources.get("/scene/camera");
      const mapRotation = yaw(cam.view());

      if (dimRef.current) {
        dimRef.current.style.opacity = `${1.0 - getMapBrightness(skyParams)}`;
      }

      if (transformRef.current) {
        transformRef.current.style.transform = `rotate(${mapRotation}rad)`;
      }
    });

    // Center the map around the player's location.
    const [error, _setError] = useError();

    return (
      <div
        className={`mini-map ${MINI_MAP_HEIGHT} ${MINI_MAP_WIDTH} select-none rounded-full to-tooltip-bg shadow-[0_0_0_0.2vmin_#000]`}
      >
        <div className="h-full w-full" ref={(newMap) => setMap(newMap)}>
          <div
            className="relative h-full w-full"
            ref={transformRef}
            style={{
              willChange: "transform",
            }}
          >
            <MaybeError error={error} />
            {!mapData && <></>}
            {map && mapData && (
              <MiniMapContext.Provider value={{ map, zoom, zoomRef }}>
                <PureTiledMapImage data={mapData} />
                <div
                  className={`absolute left-0 top-0 ${MINI_MAP_HEIGHT} w-full rounded-full shadow-[inset_0_0_0_0.2vmin_rgba(255,255,255,0.2)]`}
                />
                <div
                  className="absolute left-0 top-0 h-full w-full rounded-full bg-black"
                  ref={dimRef}
                />
                <div className="items-top absolute left-0 top-0 flex h-full w-full justify-center text-sm text-shadow-bordered">
                  N
                </div>

                <MiniMapNavigationAidMarkers />
                <MiniMapOtherRobotMarkers />
                <MiniMapOtherPlayerMarkers />
                <MiniMapLocalPlayerRobotMarker />
                <MiniMapLocalPlayerMarker />

                {children}
              </MiniMapContext.Provider>
            )}
          </div>
        </div>
      </div>
    );
  });
