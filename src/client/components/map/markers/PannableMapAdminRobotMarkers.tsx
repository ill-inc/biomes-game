import AdminRobotMarker from "@/client/components/admin/robots/AdminRobotMarker";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  setCurrentEntity,
  setInlineAdminVisibility,
} from "@/client/game/resources/bikkie";
import { useInterval } from "@/client/util/intervals";
import type { RobotsRequest } from "@/pages/api/admin/robots";
import { zRobotsResponse } from "@/pages/api/admin/robots";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { Vec2 } from "@/shared/math/types";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import type { LatLngExpression } from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Polyline } from "react-leaflet";

export const PannableMapAdminRobotMarkers: React.FunctionComponent<{}> =
  ({}) => {
    const { reactResources } = useClientContext();
    const [robots, setRobots] = useState<Entity[]>([]);
    const currentEntity = reactResources.use("/admin/current_entity");

    useEffect(() => {
      return () => setCurrentEntity(reactResources, undefined);
    }, []);

    useInterval(() => {
      void (async () => {
        const robots = await zjsonPost<RobotsRequest, typeof zRobotsResponse>(
          "/api/admin/robots",
          {},
          zRobotsResponse
        );
        setRobots(robots.robots.map((e) => e.entity));
      })();
    }, 1000);

    const SNAP_TO_GRID = 32;
    const worldMetadata = reactResources.get("/ecs/metadata");
    const v0 = worldMetadata.aabb.v0.map(
      (v) => Math.floor(v / SNAP_TO_GRID) * SNAP_TO_GRID
    );
    const v1 = worldMetadata.aabb.v1.map(
      (v) => Math.ceil(v / SNAP_TO_GRID) * SNAP_TO_GRID
    );

    const mapCoord = (x: number, z: number): Vec2 => {
      return [-z, x];
    };

    const gridPolyline = useMemo(() => {
      const ret: LatLngExpression[][] = [];
      for (let x = v0[0]; x <= v1[0]; x += SNAP_TO_GRID) {
        ret.push([mapCoord(x, v0[2]), mapCoord(x, v1[2])]);
      }
      for (let z = v0[2]; z <= v1[2]; z += SNAP_TO_GRID) {
        ret.push([mapCoord(v0[0], z), mapCoord(v1[0], z)]);
      }
      return ret;
    }, []);

    const worldBoundsPolyline = useMemo(() => {
      const ret: LatLngExpression[][] = [
        [mapCoord(v0[0], v0[2]), mapCoord(v1[0], v0[2])],
        [mapCoord(v1[0], v0[2]), mapCoord(v1[0], v1[2])],
        [mapCoord(v1[0], v1[2]), mapCoord(v0[0], v1[2])],
        [mapCoord(v0[0], v1[2]), mapCoord(v0[0], v0[2])],
      ];
      return ret;
    }, []);

    const onRobotClick = useCallback(
      (robot: Entity) => {
        if (currentEntity.entity?.id !== robot.id) {
          setCurrentEntity(reactResources, robot);
          setInlineAdminVisibility(reactResources, "ecs");
        } else {
          setCurrentEntity(reactResources, undefined);
          setInlineAdminVisibility(reactResources, undefined);
        }
      },
      [currentEntity]
    );

    return (
      <>
        {robots.map((robot) => (
          <AdminRobotMarker
            key={robot.id}
            robot={robot}
            selected={robot.id === currentEntity.entity?.id}
            onClick={() => onRobotClick(robot)}
          />
        ))}
        <Polyline
          pathOptions={{ color: "white", weight: 1, opacity: 0.2 }}
          positions={gridPolyline}
        />
        <Polyline
          pathOptions={{ color: "white", weight: 1 }}
          positions={worldBoundsPolyline}
        />
      </>
    );
  };
