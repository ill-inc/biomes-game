import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  MarkerZIndexes,
  world2ToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { useMapEdgePositionAngle } from "@/client/components/map/leaflet_helpers";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { imageUrlForSize } from "@/shared/util/urls";
import { divIcon } from "leaflet";
import { floor } from "lodash";
import React, { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";
import navigationMarkerArrow from "/public/hud/nav-aid-pointer-quest-side.png";

export const PannableMapOtherPlayerMarker: React.FunctionComponent<{
  id: BiomesId;
  onClick?: (bundle: UserInfoBundle) => unknown;
}> = React.memo(({ id, onClick }) => {
  const { socialManager, mapManager, reactResources } = useClientContext();
  const user = useCachedUserInfo(socialManager, id);
  const [hasMarkerSet, _setMarker] =
    mapManager.react.useTrackingPlayerStatus(id);
  const vmin = Math.min(window.innerWidth, window.innerHeight) / 100;
  const width = 2 * vmin;
  const position = reactResources.use("/ecs/c/position", id)?.v ?? [0, 0, 0];
  const [clampedPos, angle] = useMapEdgePositionAngle(
    position,
    width + vmin,
    hasMarkerSet
  );
  const arrow = useMemo(() => {
    if (angle === undefined) {
      return <></>;
    }
    return (
      <div
        className="map-edge-arrow"
        style={{
          transform: `rotate(${angle}rad)`,
        }}
      >
        <img className="h-2 w-2" src={navigationMarkerArrow.src} />
      </div>
    );
    // floor() to prevent frequent re-renders; they will flicker if too often
  }, [angle && floor(angle * 10)]);

  const iconClass = `marker-wrapper`;
  const imageCss = `box-shadow: inset 0 0 0 0.2vmin ${
    hasMarkerSet ? "var(--purple)" : "rgba(255,255,255,0.2)"
  }, 0 0 0 0.2vmin black; width: ${width}px; height: ${width}px;`;

  const icon = useMemo(() => {
    if (!user) {
      return;
    }
    return divIcon({
      className: iconClass,
      iconSize: [width, width],
      iconAnchor: [width / 2, width / 2],
      html: `<div class="marker-wrapper flex items-center justify-center">
                  <div class="tooltip-content">
                    <div class="username">${user.user.username}</div>
                  </div>
                  <img style="${imageCss}" class="w-2 h-2 rounded-full bg-tooltip-bg marker" src=${imageUrlForSize(
        "thumbnail",
        user.user.profilePicImageUrls
      )} />
                  ${renderToStaticMarkup(arrow)}
                  </div>
                `,
    });
  }, [arrow, user?.user.username, user?.user.profilePicImageUrls]);

  if (!user || !icon) {
    return <></>;
  }

  return (
    <Marker
      position={world2ToPannableMapCoordinates(clampedPos)}
      icon={icon}
      zIndexOffset={MarkerZIndexes.OTHER_PLAYERS}
      eventHandlers={{
        click: () => {
          onClick?.(user);
        },
        contextmenu: () => {
          mapManager.setTrackingPlayer(id, !mapManager.isTrackingPlayer(id));
        },
      }}
    />
  );
});
