import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  MarkerZIndexes,
  worldToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { divIcon } from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";

import localPlayerMarkerBig from "/public/hud/player-marker-small.png";

export const PannableMapLocalPlayerMarker: React.FunctionComponent<{}> =
  ({}) => {
    const { reactResources } = useClientContext();
    const player = reactResources.use("/scene/local_player");
    const playerMapPos = worldToPannableMapCoordinates(player.player.position);
    const orientation = -player.player.orientation[1];

    const icon = useMemo(
      () =>
        divIcon({
          iconSize: [24, 24],
          iconAnchor: [24 / 2, 24 / 2],
          className: "local-marker",
          html: `<div style="transform: rotate(${orientation}rad); background-image: url(${localPlayerMarkerBig.src})" class="local-marker-inner"></div>`,
        }),
      [orientation]
    );

    return (
      <Marker
        position={playerMapPos}
        icon={icon}
        zIndexOffset={MarkerZIndexes.LOCAL_PLAYER}
      />
    );
  };
