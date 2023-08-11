import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MiniMapContext } from "@/client/components/map/MiniMap";
import { worldToMinimapCanvasCoordinates } from "@/client/components/map/helpers";
import { useAnimation } from "@/client/util/animation";
import React, { useContext, useRef } from "react";
import localPlayerMarkerSmall from "/public/hud/player-marker-small.png";

export const MiniMapLocalPlayerMarker: React.FunctionComponent<{}> = React.memo(
  ({}) => {
    const { map, zoomRef } = useContext(MiniMapContext);
    const { reactResources } = useClientContext();

    const imgRef = useRef<HTMLImageElement>(null);

    useAnimation(() => {
      const player = reactResources.get("/scene/local_player");
      const [x, y] = worldToMinimapCanvasCoordinates(
        player.player.position,
        player,
        zoomRef.current,
        map?.offsetWidth || 0,
        map?.offsetHeight || 0
      );
      const orientation = -player.player.orientation[1];
      if (imgRef.current) {
        imgRef.current.style.transform = `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotate(${orientation}rad)`;
      }
    });

    const mapMarker = localPlayerMarkerSmall.src;
    return (
      <img
        className={`w-2`}
        src={mapMarker}
        ref={imgRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: "1",
          willChange: "transform",
        }}
      />
    );
  }
);
