import { worldToPannableMapCoordinates } from "@/client/components/map/helpers";
import type { Entity } from "@/shared/ecs/gen/entities";
import { add, mul, nearestGridPosition } from "@/shared/math/linear";
import type { Vec2 } from "@/shared/math/types";
import { divIcon } from "leaflet";
import { useMemo, useRef } from "react";
import { Marker, Popup, Rectangle } from "react-leaflet";

const AdminRobotMarker: React.FunctionComponent<{
  robot: Entity;
  selected?: boolean;
  onClick?: () => void;
}> = ({ robot, selected, onClick }) => {
  // Remove existing popup bubble.
  const marker = useRef<any>(null);
  marker.current?.off("click");

  if (!robot.position || !robot.projects_protection) {
    return <></>;
  }

  const protectionCenter = robot.projects_protection.snapToGrid
    ? nearestGridPosition(
        robot.position.v,
        robot.projects_protection.size,
        robot.projects_protection.snapToGrid
      )
    : robot.position.v;

  const labelPos: Vec2 = worldToPannableMapCoordinates(protectionCenter);

  const rectBounds = [
    add(protectionCenter, mul(-0.5, robot.projects_protection.size)),
    add(protectionCenter, mul(0.5, robot.projects_protection.size)),
  ].map(worldToPannableMapCoordinates);

  const iconSize: Vec2 = [50, 50];
  let legend = "";
  if (
    !robot.projects_protection?.protection &&
    robot.projects_protection?.restoration
  ) {
    legend = "↩️";
  }
  const icon = useMemo(
    () =>
      divIcon({
        iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
        html: `${robot.label?.text ?? "Robot"} <div>${legend}</div>`,
        className: `text-xs flex items-center justify-center bg-transparent ${
          !robot.unmuck && "text-light-purple"
        }`,
      }),
    [robot.label?.text, rectBounds]
  );
  // overlapping fields not handled yet
  // i think theres a couple options of doing it:
  // 1. use <ImageOverlay> with a truncated full map image, and z-index with
  //    the placed time
  // 2. compute shape by doing a pointwise DFS, similar to what the land map
  //    does (see mapShape in AdminLandMap).
  // #1 probably easier
  // #2 is probably a lot more work, since you'd need to cache this shape as well
  // but #2 can probably share code with client more directly

  return (
    <>
      <Marker
        ref={marker}
        position={labelPos}
        icon={icon}
        eventHandlers={
          onClick && {
            click: () => onClick?.(),
          }
        }
      >
        <Popup>{robot.label?.text ?? "Robot"}</Popup>
      </Marker>
      <div>
        <Rectangle
          bounds={rectBounds}
          pathOptions={{
            color: selected ? "white" : "rgba(255,255,255,.75)",
            weight: selected ? 3 : 2,
          }}
          eventHandlers={
            onClick && {
              click: () => onClick?.(),
            }
          }
        />
      </div>
    </>
  );
};
export default AdminRobotMarker;
