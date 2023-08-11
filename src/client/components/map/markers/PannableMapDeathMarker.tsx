import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  MarkerZIndexes,
  worldToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { divIcon } from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import deathMarker from "/public/hud/death-marker.png";
const maxDisplayTimeSeconds = 60 * 60 * 12;

export const PannableMapDeathMarker: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, userId } = useClientContext();
  const deathInfo = reactResources.use("/ecs/c/death_info", userId);

  const html = `
      <div class="marker-wrapper">
        <div class="items">
        <div class="tooltip-content">
          <div class="username">You died here</div>
        </div>
        <div
          class="marker"
        >
        <img src="${deathMarker.src}" class="w-2.5 h-2.5" />
        </div>
      </div>`;

  const icon = useMemo(
    () =>
      divIcon({
        iconSize: [24, 24],
        iconAnchor: [24 / 2, 24 / 2],
        className: "local-marker",
        html: html,
      }),
    []
  );

  if (
    !deathInfo ||
    !deathInfo.last_death_pos ||
    secondsSinceEpoch() - (deathInfo.last_death_time ?? 0) >
      maxDisplayTimeSeconds
  ) {
    return <></>;
  }

  return (
    <Marker
      position={worldToPannableMapCoordinates(deathInfo.last_death_pos)}
      icon={icon}
      zIndexOffset={MarkerZIndexes.LOCAL_PLAYER}
    />
  );
};
