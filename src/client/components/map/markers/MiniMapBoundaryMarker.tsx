import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MiniMapContext } from "@/client/components/map/MiniMap";
import {
  worldToMinimapCanvasCoordinates,
  worldToMinimapMapCoordinates,
} from "@/client/components/map/helpers";
import type { ProtectionMapBoundary } from "@/client/game/resources/protection";
import { useAnimation } from "@/client/util/animation";
import {
  add2,
  clampv2,
  scale2,
  sizeAABB2,
  sub2,
  unionAABB2,
} from "@/shared/math/linear";
import type { AABB2, Vec2 } from "@/shared/math/types";
import { useContext, useRef } from "react";

function transformMapBoundary(
  points: [Vec2, Vec2][],
  aabb: AABB2,
  zoom: number
) {
  const size = sizeAABB2(aabb);
  const inset = 1;
  return points.map((e) => [
    clampv2(
      worldToMinimapMapCoordinates(
        [e[0][0] - aabb[0][0], 0, e[0][1] - aabb[0][1]],
        zoom
      ),
      worldToMinimapMapCoordinates([inset, 0, inset], zoom),
      worldToMinimapMapCoordinates([size[0] - inset, 10, size[1] - inset], zoom)
    ),
    clampv2(
      worldToMinimapMapCoordinates(
        [e[1][0] - aabb[0][0], 0, e[1][1] - aabb[0][1]],
        zoom
      ),
      worldToMinimapMapCoordinates([inset, 0, inset], zoom),
      worldToMinimapMapCoordinates([size[0] - inset, 10, size[1] - inset], zoom)
    ),
  ]);
}

function fieldAABB2(boundary: [Vec2, Vec2][]): AABB2 {
  let aabb = boundary[0];
  for (const otherAABB of boundary) {
    aabb = unionAABB2(aabb, otherAABB);
  }

  return aabb;
}

export const MiniMapBoundaryMarker: React.FunctionComponent<{
  boundary: ProtectionMapBoundary;
  extraClasses?: string;
}> = ({ boundary, extraClasses }) => {
  const { reactResources } = useClientContext();
  const { map, zoomRef } = useContext(MiniMapContext);
  const svgRef = useRef<SVGSVGElement>(null);
  const aabb = fieldAABB2(boundary.interior);
  const mapBoundaryInterior = transformMapBoundary(
    boundary?.interior ?? [],
    aabb,
    zoomRef.current
  );

  const mapBoundaryLines = transformMapBoundary(
    boundary?.border ?? [],
    aabb,
    zoomRef.current
  );

  useAnimation(() => {
    if (!svgRef.current) {
      return;
    }

    const player = reactResources.get("/scene/local_player");
    const svgStart0 = worldToMinimapCanvasCoordinates(
      [aabb[0][0], 0.0, aabb[0][1]],
      player,
      zoomRef.current,
      map?.offsetWidth || 0,
      map?.offsetHeight || 0
    );
    const svgStart1 = worldToMinimapCanvasCoordinates(
      [aabb[1][0], 0.0, aabb[1][1]],
      player,
      zoomRef.current,
      map?.offsetWidth || 0,
      map?.offsetHeight || 0
    );

    const size = sub2(svgStart1, svgStart0);
    const svgPos = add2(svgStart0, scale2(0.5, size));
    svgRef.current.style.transform = `translateX(-50%) translateY(-50%) translate(${svgPos[0]}px, ${svgPos[1]}px)`;
    svgRef.current.style.width = `${size[0]}px`;
    svgRef.current.style.height = `${size[1]}px`;
  });

  if (mapBoundaryLines.length === 0 || mapBoundaryInterior.length === 0) {
    return <></>;
  }

  return (
    <svg
      ref={svgRef}
      className={`absolute mix-blend-overlay ${extraClasses}`}
      style={{
        left: 0,
        top: 0,
        willChange: "transform",
      }}
    >
      {mapBoundaryLines.map((e, i) => (
        <line
          key={i}
          x1={e[0][0]}
          y1={e[0][1]}
          x2={e[1][0]}
          y2={e[1][1]}
          stroke="rgba(255, 255, 255)"
        />
      ))}
      {mapBoundaryInterior?.map((e, i) => (
        <rect
          key={i}
          x={e[0][0]}
          y={e[0][1]}
          width={e[1][0] - e[0][0]}
          height={e[1][1] - e[0][1]}
          fill="rgba(255, 255, 255, 0.2)"
        />
      ))}
    </svg>
  );
};
