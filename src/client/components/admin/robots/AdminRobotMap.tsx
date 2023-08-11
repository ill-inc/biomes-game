import AdminRobotMarker from "@/client/components/admin/robots/AdminRobotMarker";
import {
  pannableMapToWorldCoordinates,
  pannableWorldBoundsFromData,
} from "@/client/components/map/helpers";
import { PannableMapContext } from "@/client/components/map/PannableMapBase";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import styles from "@/client/styles/admin.land.module.css";
import { useAwaited } from "@/client/util/hooks";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import type { Vec2 } from "@/shared/math/types";
import type { WorldMapMetadataResponse } from "@/shared/types";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { Map as LMap } from "leaflet";
import { CRS } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropsWithChildren } from "react";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ImageOverlay, MapContainer } from "react-leaflet";

// Admin versions full knowledge and no client context
const RobotMap: React.FunctionComponent<{
  robots: Entity[];
  selectedRobot?: BiomesId;
  onSelectedChanged?: (robot?: BiomesId) => void;
}> = ({ robots, selectedRobot, onSelectedChanged }) => {
  const { map } = useContext(PannableMapContext);
  const [bounds, setBounds] = useState<[Vec2, Vec2]>([
    [0, 0],
    [0, 0],
  ]);
  const updateBounds = useCallback(() => {
    if (!map) return;
    const bounds = [
      map.getBounds().getNorthWest(),
      map.getBounds().getSouthEast(),
    ].map((p) => {
      return pannableMapToWorldCoordinates([p.lat, p.lng]);
    }) as [Vec2, Vec2];
    setBounds(bounds);
  }, [map]);

  // Update bounds when user pans around
  useEffect(() => {
    updateBounds();
    if (!map) return;
    map.on("zoomend", function () {
      updateBounds();
    });
    map.on("moveend", function () {
      updateBounds();
    });
  }, [map, updateBounds]);

  // Filter robots that aren't visible
  // (many objects on map will slow down react-leaflet)
  const filteredRobots = useMemo(
    () =>
      robots.filter((robot) => {
        const padding = 30;
        if (!robot.position) return false;
        if (
          robot.position.v[0] + padding > bounds[0][0] &&
          robot.position.v[0] - padding < bounds[1][0] &&
          robot.position.v[2] + padding > bounds[0][1] &&
          robot.position.v[2] - padding < bounds[1][1]
        ) {
          return true;
        }
        return false;
      }),
    [robots, bounds]
  );

  if (!map) {
    return <></>;
  }
  return (
    <>
      {filteredRobots.map((robot) => {
        return (
          <AdminRobotMarker
            key={robot.id}
            robot={robot}
            selected={robot.id === selectedRobot}
            onClick={() =>
              onSelectedChanged?.(
                selectedRobot !== robot.id ? robot.id : undefined
              )
            }
          />
        );
      })}
    </>
  );
};

export const AdminRobotMap: React.FunctionComponent<
  PropsWithChildren<{
    showMapBackground?: boolean;
    initialState?: {
      zoom?: number;
    };
    robots: Entity[];
    selectedRobot?: BiomesId;
    onSelectedChanged?: (robot?: BiomesId) => void;
  }>
> = ({
  showMapBackground,
  initialState,
  robots,
  selectedRobot,
  onSelectedChanged,
  children,
}) => {
  const [error, _setError] = useError();
  const map = useRef<LMap | null>(null);
  const mapMetadata = useAwaited(
    jsonFetch<WorldMapMetadataResponse>("/api/world_map/metadata")
  );
  const [version, setVersion] = useState(0);

  const initMap = useCallback(
    (newMap: LMap) => {
      map.current = newMap;
      if (newMap && mapMetadata) {
        newMap.dragging.enable();
        newMap.zoomControl.setPosition("topright");
        const worldBounds = pannableWorldBoundsFromData(mapMetadata);
        newMap.setMaxBounds(worldBounds);
        setVersion(version + 1);
      }
    },
    [mapMetadata]
  );

  if (error) {
    return (
      <div>
        <MaybeError error={error} />
      </div>
    );
  }
  if (!mapMetadata) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <MapContainer
        center={[0, 0]}
        minZoom={-1}
        maxZoom={2}
        maxBoundsViscosity={0.5}
        ref={initMap}
        zoom={initialState?.zoom || 2}
        crs={CRS.Simple}
        attributionControl={false}
        className={styles["map-container"]}
      >
        <PannableMapContext.Provider value={{ map: map.current }}>
          {showMapBackground !== false && mapMetadata && (
            <ImageOverlay
              bounds={pannableWorldBoundsFromData(mapMetadata)}
              url={mapMetadata.fullImageURL}
            />
          )}
          <RobotMap
            robots={robots}
            selectedRobot={selectedRobot}
            onSelectedChanged={onSelectedChanged}
          />
          {children}
        </PannableMapContext.Provider>
      </MapContainer>
    </>
  );
};

export default AdminRobotMap;
