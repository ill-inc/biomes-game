import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { iconUrl } from "@/client/components/inventory/icons";
import {
  MarkerZIndexes,
  worldToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { useMailboxes } from "@/client/util/map_hooks";
import { useCachedUsername } from "@/client/util/social_manager_hooks";
import type { Mailbox } from "@/pages/api/world_map/mailboxes";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { divIcon } from "leaflet";
import React, { useEffect, useMemo, useState } from "react";
import { Marker, useMapEvents } from "react-leaflet";

const MINIMUM_ZOOM_REQUIRED = 1;

export const PannableMailboxMarker: React.FunctionComponent<{
  mailbox: Mailbox;
}> = React.memo(({ mailbox }) => {
  const { table } = useClientContext();
  const [ownerId, setOwnerId] = useState<BiomesId>(INVALID_BIOMES_ID);
  const ownerName = useCachedUsername(ownerId);
  const url = iconUrl(anItem(BikkieIds.mailbox));
  const [zoom, setZoom] = useState<number>(MINIMUM_ZOOM_REQUIRED - 1);
  const mapEvents = useMapEvents({
    zoomend: () => {
      setZoom(mapEvents.getZoom());
    },
  });

  useEffect(() => {
    // Out of bounds fetch because the mailbox may be far from the player and
    // therefore not in the ClientTable.
    void table.oob.oobFetchSingle(mailbox.id).then((entity) => {
      if (entity) {
        setOwnerId(entity.placed_by?.id ?? INVALID_BIOMES_ID);
      }
    });
  }, [mailbox.id]);

  const icon = useMemo(
    () =>
      divIcon({
        className: "marker-wrapper",
        iconSize: [40, 40],
        iconAnchor: [40 / 2, 40 / 2],
        html: `<div class="items">
                  <div class="tooltip-content">
                    <div class="username">${ownerName}'s Mailbox</div>
                  </div>
                  <div class="marker">
                    <img class="avatar fixed filter-image-stroke" src="${url}" />
                  </div>
              </div>`,
      }),
    [ownerName, url]
  );

  if (!mailbox.pos || zoom < MINIMUM_ZOOM_REQUIRED) {
    return <></>;
  }

  return (
    <Marker
      position={worldToPannableMapCoordinates(mailbox.pos)}
      icon={icon}
      zIndexOffset={MarkerZIndexes.MAILBOX}
    />
  );
});

export const PannableMapMailboxMarkers: React.FunctionComponent<{}> = ({}) => {
  const clientContext = useClientContext();
  const mailboxes = useMailboxes(clientContext);

  return (
    <>
      {mailboxes.map((mailbox) => (
        <PannableMailboxMarker key={mailbox.id} mailbox={mailbox} />
      ))}
    </>
  );
};
