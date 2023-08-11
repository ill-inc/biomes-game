import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MiniMapContext } from "@/client/components/map/MiniMap";
import {
  getClientRenderPosition,
  worldToMinimapCanvasCoordinates,
  worldToMinimapClippedCanvasCoordinates,
} from "@/client/components/map/helpers";
import { getRobotProtectionSize } from "@/client/game/util/robots";
import exclaim from "/public/quests/quest-balloon-exclaim-small.png";

import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { usePlayerCreatedRobots } from "@/client/components/map/hooks";
import { MiniMapBoundaryMarker } from "@/client/components/map/markers/MiniMapBoundaryMarker";
import { MiniMapMarkersContainer } from "@/client/components/map/markers/MiniMapOtherPlayerMarkers";
import type { ProtectionMapBoundary } from "@/client/game/resources/protection";
import { useAnimation } from "@/client/util/animation";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { containsAABB, yaw } from "@/shared/math/linear";
import { mapSet } from "@/shared/util/collections";
import { ok } from "assert";
import { motion } from "framer-motion";
import React, { useContext, useRef, useState } from "react";

const MiniMapRobotBoundary: React.FunctionComponent<{
  robotId: BiomesId;
}> = ({ robotId }) => {
  const { resources, reactResources } = useClientContext();
  const [showProtection, setShowProtection] = useState(false);
  const [insideProtectionZone, setInsideProtectionZone] = useState(false);
  const [boundary, setBoundary] = useState<ProtectionMapBoundary | undefined>();

  useAnimation(() => {
    const player = reactResources.get("/scene/local_player");
    const protectionSize = getRobotProtectionSize(resources, robotId);
    const previewBoundary = reactResources.get("/robots/preview_map_boundary");
    const boundary = reactResources.get("/protection/map_boundary", robotId);

    // If there is a preview boundary, show it.
    if (previewBoundary) {
      setShowProtection(true);
      setInsideProtectionZone(true);
      setBoundary(previewBoundary);
      return;
    }

    // If robot has no protection field, return and only show the robot icon.
    const { aabb } = reactResources.get("/protection/boundary", robotId);
    if (!boundary || !protectionSize || !aabb) {
      setShowProtection(false);
      setBoundary(undefined);
      return;
    }

    const effectiveRobotId = reactResources.get(
      "/player/effective_robot"
    ).value;
    setShowProtection(effectiveRobotId === robotId);
    setInsideProtectionZone(containsAABB(aabb, player.player.position));
    setBoundary(boundary);
  });

  if (!showProtection || !insideProtectionZone || !boundary) {
    return <></>;
  }

  return <MiniMapBoundaryMarker boundary={boundary} />;
};

const MiniMapRobotMarkerIcon: React.FunctionComponent<{
  robotId: BiomesId;
  clipToEdge?: boolean;
}> = ({ robotId, clipToEdge }) => {
  const { map, zoomRef } = useContext(MiniMapContext);
  ok(map);
  const clientContext = useClientContext();
  const { reactResources, userId, resources } = clientContext;
  const iconElementRef = useRef<HTMLDivElement>(null);
  const [robotBadged, _setRobotBadged] = useState(false);

  const creator = reactResources.use("/ecs/c/created_by", robotId);

  useAnimation(() => {
    const player = reactResources.get("/scene/local_player");
    const camera = reactResources.get("/scene/camera");
    const orientation = -yaw(camera.view());

    const robotPos = getClientRenderPosition(resources, robotId);
    if (!robotPos) {
      return;
    }

    const [x, y] = clipToEdge
      ? worldToMinimapClippedCanvasCoordinates(
          map.clientWidth / 2,
          robotPos,
          player,
          zoomRef.current,
          map.offsetWidth ?? 0,
          map.offsetHeight ?? 0
        )
      : worldToMinimapCanvasCoordinates(
          robotPos,
          player,
          zoomRef.current,
          map.offsetWidth ?? 0,
          map.offsetHeight ?? 0
        );

    if (iconElementRef.current) {
      iconElementRef.current.style.transform = `translateX(-50%) translateY(-50%) translate(${x}px, ${y}px) rotate(${orientation}rad)`;
    }

    // TODO: add back in robot badging when we fix resources
  });

  return (
    <>
      {creator?.id === userId && (
        <div
          className={`absolute ${robotBadged ? "h-[3vmin]" : "h-[2vmin]"} ${
            robotBadged ? "h-[3vmin]" : "h-[2vmin]"
          }`}
          style={{
            left: 0,
            top: 0,
            willChange: "transform",
          }}
          ref={iconElementRef}
        >
          <ItemIcon
            item={anItem(BikkieIds.biomesRobot)}
            className="h-full w-full filter-image-stroke"
          />
          {robotBadged && (
            <motion.div
              className="absolute right-0 top-0"
              initial={{ x: "30%", y: "-30%" }}
              animate={{
                rotateZ: [0, -5, 5, -5, 5, 0],
              }}
              transition={{
                repeat: Infinity,
                repeatDelay: 8,
                type: "tween",
                duration: 0.8,
                ease: "easeInOut",
              }}
            >
              <img className="w-2.5" src={exclaim.src} />
            </motion.div>
          )}
        </div>
      )}
    </>
  );
};

export const MiniMapOtherRobotMarkers: React.FunctionComponent<{}> = ({}) => {
  const { map } = useContext(MiniMapContext);
  const { reactResources } = useClientContext();

  const createdRobots = usePlayerCreatedRobots(1);
  const effectiveRobotId = reactResources.use("/player/effective_robot").value;

  if (!map) {
    return <></>;
  }

  return (
    <>
      {effectiveRobotId && !createdRobots.has(effectiveRobotId) && (
        <>
          <MiniMapMarkersContainer overflow="visible">
            <MiniMapRobotMarkerIcon
              robotId={effectiveRobotId}
              clipToEdge={true}
            />
          </MiniMapMarkersContainer>
          <MiniMapMarkersContainer overflow="hidden">
            <MiniMapRobotBoundary robotId={effectiveRobotId} />
          </MiniMapMarkersContainer>
        </>
      )}
    </>
  );
};

export const MiniMapLocalPlayerRobotMarker: React.FunctionComponent<{}> =
  ({}) => {
    const { map } = useContext(MiniMapContext);

    const createdRobots = usePlayerCreatedRobots(1);

    if (!map) {
      return <></>;
    }

    return (
      <>
        <MiniMapMarkersContainer overflow="visible">
          {mapSet(createdRobots, (id) => {
            return (
              <MiniMapRobotMarkerIcon key={id} robotId={id} clipToEdge={true} />
            );
          })}
        </MiniMapMarkersContainer>
        <MiniMapMarkersContainer overflow="hidden">
          {mapSet(createdRobots, (id) => {
            return <MiniMapRobotBoundary key={id} robotId={id} />;
          })}
        </MiniMapMarkersContainer>
      </>
    );
  };
