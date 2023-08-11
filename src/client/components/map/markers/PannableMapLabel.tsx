import { MarkerZIndexes } from "@/client/components/map/helpers";
import type { ReadonlyVec2 } from "@/shared/math/types";
import type { LatLngTuple } from "leaflet";
import { divIcon } from "leaflet";
import { truncate } from "lodash";
import React, { useMemo } from "react";
import { Marker } from "react-leaflet";

export const PannableMapLabel: React.FunctionComponent<{
  name: string;
  position: ReadonlyVec2;
  extraClasses?: string;
}> = React.memo(({ name, position, extraClasses }) => {
  const width = 200;
  const icon = useMemo(
    () =>
      divIcon({
        iconSize: [width, width],
        iconAnchor: [width / 2, 0],
        className: `text-s ${extraClasses || ""}`,
        html: `${truncate(name, { length: 20 })}`,
      }),
    []
  );

  return (
    <Marker
      position={position as LatLngTuple}
      icon={icon}
      zIndexOffset={MarkerZIndexes.LABEL}
    />
  );
});
