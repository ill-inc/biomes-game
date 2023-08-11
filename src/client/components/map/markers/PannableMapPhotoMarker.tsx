import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  MarkerZIndexes,
  worldToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { useCachedPostBundle } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import type { FeedPostBundle } from "@/shared/types";
import { imageUrlForSize } from "@/shared/util/urls";
import { divIcon } from "leaflet";
import React, { useState } from "react";
import { Marker } from "react-leaflet";

export const PannableMapPhotoMarker: React.FunctionComponent<{
  id: BiomesId;
  onClick?: (post: FeedPostBundle) => unknown;
}> = React.memo(({ id, onClick }) => {
  const { socialManager } = useClientContext();
  const photo = useCachedPostBundle(socialManager, id);
  const [isHovering, setIsHovering] = useState(false);

  if (!photo || !photo.metadata?.coordinates) {
    return <></>;
  }

  const imageUrl = imageUrlForSize("thumbnail", photo.imageUrls);
  if (!imageUrl) {
    return <></>;
  }

  const leafletIcon = isHovering
    ? divIcon({
        iconSize: [128, 128],
        iconAnchor: [128 / 2, 128 / 2],
        className: "pan-photo-marker big",
        html: `
                      <img src=${imageUrl} />
        `,
      })
    : divIcon({
        iconSize: [40, 40],
        iconAnchor: [40 / 2, 40 / 2],
        className: "pan-photo-marker",
        html: `
                  <img src=${imageUrl} />
    `,
      });

  return (
    <Marker
      position={worldToPannableMapCoordinates(photo.metadata.coordinates)}
      icon={leafletIcon}
      autoPan={true}
      zIndexOffset={
        isHovering ? MarkerZIndexes.HOVER_PHOTOS : MarkerZIndexes.PHOTOS
      }
      eventHandlers={{
        click: () => {
          onClick?.(photo);
        },
        mouseout: () => {
          setIsHovering(false);
        },
        mouseover: () => {
          setIsHovering(true);
        },
      }}
    />
  );
});
