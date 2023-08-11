// If this is too slow, set whileMoving to false, and it will only updateBounds

import {
  pannableMapToWorldCoordinates,
  zoomScale,
} from "@/client/components/map/helpers";
import { PannableMapContext } from "@/client/components/map/PannableMapBase";
import { xzProject } from "@/shared/math/linear";
import type { ReadonlyVec3, Vec2 } from "@/shared/math/types";
import { isEqual } from "lodash";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";

// when the map is finished zooming/panning
export function useMapBounds(
  active: boolean = true,
  whileMoving: boolean = true
) {
  const { map } = useContext(PannableMapContext);
  const [bounds, setBounds] = useState<[Vec2, Vec2]>([
    [0, 0],
    [0, 0],
  ]);
  const [moving, setMoving] = useState(0);
  const updateBounds = useCallback(() => {
    if (!map) return;
    const bounds = [
      map.getBounds().getNorthWest(),
      map.getBounds().getSouthEast(),
    ].map((p) => {
      return pannableMapToWorldCoordinates([p.lat, p.lng]);
    }) as [Vec2, Vec2];
    setBounds(bounds);
  }, [map, setBounds]);
  // Update bounds when user pans around
  useEffect(() => {
    updateBounds();
    if (!map || !active) return;
    const movingStartFn = () => {
      setMoving((m) => m + 1);
    };
    const movingEndFn = () => {
      updateBounds();
      setMoving((m) => m - 1);
    };
    const movingFn = () => {
      updateBounds();
    };

    map.on("zoomstart", movingStartFn);
    map.on("zoomend", movingEndFn);
    map.on("movestart", movingStartFn);
    map.on("moveend", movingEndFn);
    if (whileMoving) {
      map.on("move", movingFn);
    }
    return () => {
      map.off("zoomstart", movingStartFn);
      map.off("zoomend", movingEndFn);
      map.off("movestart", movingStartFn);
      map.off("moveend", movingEndFn);
      if (whileMoving) {
        map.off("move", movingFn);
      }
    };
  }, [map, updateBounds, active, whileMoving]);
  return [bounds, moving !== 0] as [[Vec2, Vec2], boolean];
}

// Force a given position to clamp to edge of the map
// Set whileMoving to false if this is slow, and this will only update when
// the map is finished zooming/panning
export function useMapEdgePosition(
  worldPos: ReadonlyVec3,
  padding: number = 0,
  snapToEdge: boolean = true,
  whileMoving: boolean = true
) {
  const { map } = useContext(PannableMapContext);
  const zoomedPadding = padding / zoomScale(map?.getZoom() ?? 1.0);
  const [bounds, _moving] = useMapBounds(snapToEdge, whileMoving);
  const pos = xzProject(worldPos);
  return useMemo(() => {
    if (!snapToEdge) {
      return [pos, false] as [Vec2, boolean];
    }
    const bounded = [
      Math.max(
        bounds[0][0] + zoomedPadding,
        Math.min(bounds[1][0] - zoomedPadding, pos[0])
      ),
      Math.max(
        bounds[0][1] + zoomedPadding,
        Math.min(bounds[1][1] - zoomedPadding, pos[1])
      ),
    ] as Vec2;
    return [bounded, !isEqual(bounded, pos)] as [Vec2, boolean];
  }, [bounds, ...pos, zoomedPadding, snapToEdge]);
}

export function useMapEdgePositionAngle(
  worldPos: ReadonlyVec3,
  padding: number = 0,
  snapToEdge: boolean = true,
  whileMoving: boolean = true
) {
  const [pos, onEdge] = useMapEdgePosition(
    worldPos,
    padding,
    snapToEdge,
    whileMoving
  );
  const angle = Math.atan2(worldPos[0] - pos[0], pos[1] - worldPos[2]);
  return [pos, onEdge ? angle : undefined] as [Vec2, number | undefined];
}
