import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  pannableMapToWorldCoordinates,
  pannableWorldBoundsFromData,
  SINGLETON_NAVIGATION_BEAM_ID,
  worldToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { PannableMapTiles } from "@/client/components/map/pannable/PannableMapTiles";
import { MaybeError, useError } from "@/client/components/system/MaybeError";

import type { Vec2, Vec3 } from "@/shared/math/types";
import type { Map as LMap } from "leaflet";
import { CRS, Icon } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import type { PropsWithChildren } from "react";
import React, { useCallback, useMemo, useRef } from "react";
import { MapContainer } from "react-leaflet";

Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

export const PannableMapContext = React.createContext<{
  map: LMap | null;
}>({ map: null });

export const PannableMapBase: React.FunctionComponent<
  PropsWithChildren<{
    showMapBackground?: boolean;
    initialState?: {
      zoom?: number;
      position?: Vec3;
    };
    init?: (map: LMap) => void;
    mapRef?: React.MutableRefObject<LMap | null>;
  }>
> = ({ showMapBackground, initialState, mapRef, init, children }) => {
  const { reactResources, mapManager } = useClientContext();
  const [error, _setError] = useError();
  const [mapLoading, mapData] = mapManager.react.useMapMetadata();
  const map = useRef<LMap | null>(null);
  const mapMouseDownTime = useRef<number>(0);
  const mapMouseDownCoords = useRef<Vec2>([0, 0]);
  const tweaks = reactResources.use("/tweaks");
  const navigationBeams = mapManager.react.useNavigationAids();

  const initMap = useCallback(
    (newMap: LMap) => {
      map.current = newMap;
      if (mapRef) {
        mapRef.current = newMap;
      }

      if (newMap && mapData) {
        newMap.zoomControl.setPosition("topright");
        const worldBounds = pannableWorldBoundsFromData(mapData);
        newMap.setMaxBounds(worldBounds);
        newMap.on("contextmenu", (e) => {
          mapManager.removeNavigationAid(SINGLETON_NAVIGATION_BEAM_ID);
          mapManager.addNavigationAid(
            {
              kind: "placed",
              autoremoveWhenNear: true,
              target: {
                kind: "pos2d",
                position: pannableMapToWorldCoordinates([
                  e.latlng.lat,
                  e.latlng.lng,
                ]),
              },
            },

            SINGLETON_NAVIGATION_BEAM_ID
          );
        });
        newMap.on("mousedown", (e) => {
          if (document.getElementsByClassName("leaflet-popup").length === 0) {
            mapMouseDownTime.current = performance.now();
            mapMouseDownCoords.current = pannableMapToWorldCoordinates([
              e.latlng.lat,
              e.latlng.lng,
            ]);
          }
        });
        newMap.on("drag", () => {
          mapMouseDownTime.current = performance.now();
        });
        newMap.on("mouseup", (e) => {
          if (performance.now() - mapMouseDownTime.current > 500) {
            const upPos = pannableMapToWorldCoordinates([
              e.latlng.lat,
              e.latlng.lng,
            ]);
            const threshold = 30;
            if (
              Math.abs(upPos[0] - mapMouseDownCoords.current[0]) < threshold &&
              Math.abs(upPos[1] - mapMouseDownCoords.current[1]) < threshold
            ) {
              if (navigationBeams.size > 0) {
                for (const [beamId, _] of navigationBeams) {
                  mapManager.removeNavigationAid(beamId);
                }
              }
              mapManager.removeNavigationAid(SINGLETON_NAVIGATION_BEAM_ID);
              mapManager.addNavigationAid(
                {
                  autoremoveWhenNear: true,
                  kind: "placed",
                  target: {
                    kind: "pos2d",
                    position: pannableMapToWorldCoordinates([
                      e.latlng.lat,
                      e.latlng.lng,
                    ]),
                  },
                },
                SINGLETON_NAVIGATION_BEAM_ID
              );
            }
          }
        });
        init?.(newMap);
      }
    },
    [mapData, init]
  );

  const initialPosition = useMemo(() => {
    if (initialState?.position) {
      return initialState.position;
    }
    return reactResources.get("/scene/local_player").player.position;
  }, []);

  if (error) {
    return (
      <div>
        <MaybeError error={error} />
      </div>
    );
  } else if (mapLoading && !mapData) {
    return <div>Map loading</div>;
  } else if (!mapData) {
    return <div>Bad state</div>;
  }

  return (
    <>
      <MapContainer
        center={worldToPannableMapCoordinates(initialPosition)}
        minZoom={tweaks.pannableMapMinZoom}
        maxZoom={tweaks.pannableMapMaxZoom}
        maxBoundsViscosity={tweaks.pannableMapBoundsViscosity}
        bounds={pannableWorldBoundsFromData(mapData)}
        maxBounds={pannableWorldBoundsFromData(mapData)}
        ref={initMap}
        zoom={initialState?.zoom || 0}
        crs={CRS.Simple}
        attributionControl={false}
      >
        <PannableMapContext.Provider value={{ map: map.current }}>
          {showMapBackground !== false && mapData && (
            <PannableMapTiles mapData={mapData} />
          )}
          {children}
        </PannableMapContext.Provider>
      </MapContainer>
    </>
  );
};

export default PannableMapBase;
