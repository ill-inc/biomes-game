import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useNearbyAndTrackedPlayers } from "@/client/components/map/hooks";
import { PannableMapOtherPlayerMarker } from "@/client/components/map/markers/PannableMapOtherPlayerMarker";
import { mapSet } from "@/shared/util/collections";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import React from "react";

export const PannableMapOtherPlayerMarkers: React.FunctionComponent<{
  onClick?: (bundle: UserInfoBundle) => unknown;
}> = React.memo(({ onClick }) => {
  const { userId } = useClientContext();
  const markers = useNearbyAndTrackedPlayers();
  return (
    <>
      {mapSet(markers, (id) => {
        if (id === userId) {
          return undefined;
        }
        return (
          <PannableMapOtherPlayerMarker key={id} id={id} onClick={onClick} />
        );
      })}
    </>
  );
});
