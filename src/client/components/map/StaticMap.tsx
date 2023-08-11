import {
  pannableWorldBoundsFromData,
  world2ToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { PannableMapLandmarkLabels } from "@/client/components/map/markers/PannableMapLandmarkLabels";
import { PannableMapTiles } from "@/client/components/map/pannable/PannableMapTiles";
import { PannableMapContext } from "@/client/components/map/PannableMapBase";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useAsyncInitialDataFetch } from "@/client/util/hooks";
import type { LandmarksResponse } from "@/pages/api/world_map/landmarks";
import type { MapTileMetadata } from "@/server/web/db/map";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { Map as LMap } from "leaflet";
import { CRS } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropsWithChildren } from "react";
import React, { useCallback, useRef, useState } from "react";
import { MapContainer } from "react-leaflet";

export const StaticMap: React.FunctionComponent<
  PropsWithChildren<{
    tileMetadata: MapTileMetadata;
  }>
> = ({ tileMetadata, children }) => {
  const [error, _setError] = useError();
  const map = useRef<LMap | null>(null);
  const [version, setVersion] = useState(0);

  const initMap = useCallback(
    (newMap: LMap) => {
      map.current = newMap;
      if (newMap && tileMetadata) {
        newMap.dragging.enable();
        newMap.zoomControl.setPosition("topright");
        const worldBounds = pannableWorldBoundsFromData(tileMetadata);
        newMap.setMaxBounds(worldBounds);
        setVersion(version + 1);
      }
    },
    [tileMetadata]
  );

  const landmarks = useAsyncInitialDataFetch(() =>
    jsonFetch<LandmarksResponse>("/api/world_map/landmarks")
  );

  if (error) {
    return (
      <div>
        <MaybeError error={error} />
      </div>
    );
  }
  return (
    <MapContainer
      center={world2ToPannableMapCoordinates([500, -120])}
      minZoom={-1}
      maxZoom={4}
      maxBoundsViscosity={0.5}
      ref={initMap}
      zoom={2}
      crs={CRS.Simple}
      attributionControl={false}
      className="vw-100 vh-100 static-map"
    >
      <PannableMapContext.Provider value={{ map: map.current }}>
        <PannableMapTiles mapData={tileMetadata} tileType="surface" />
        {landmarks.data && (
          <PannableMapLandmarkLabels landmarks={landmarks.data} />
        )}
        {children}
      </PannableMapContext.Provider>
    </MapContainer>
  );
};

export default StaticMap;
