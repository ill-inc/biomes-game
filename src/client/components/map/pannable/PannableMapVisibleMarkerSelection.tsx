import React from "react";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { capitalize } from "lodash";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import type { ClientReactResources } from "@/client/game/resources/types";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import type { VisibleMapMarker } from "@/client/util/typed_local_storage";
import { zVisibleMapMarker } from "@/client/util/typed_local_storage";
import robotTransmissionQuestMarkSmall from "/public/quests/quest-balloon-exclaim-small.png";

function iconForMarker(
  resources: ClientReactResources,
  marker: VisibleMapMarker
) {
  switch (marker) {
    case "mailboxes":
      return <ItemIcon item={anItem(BikkieIds.mailbox)} />;
    case "robot":
      return <ItemIcon item={anItem(BikkieIds.biomesRobot)} />;
    case "players":
      return (
        <EntityProfilePic entityId={resources.get("/scene/local_player").id} />
      );
    case "quests":
      return <img src={robotTransmissionQuestMarkSmall.src} />;
  }
}

export const PannableMapVisibleMarkerSelection: React.FunctionComponent<{
  visibleMarkers: VisibleMapMarker[];
  setVisibleMarkers: (markers: VisibleMapMarker[]) => void;
}> = React.memo(({ visibleMarkers, setVisibleMarkers }) => {
  const { reactResources } = useClientContext();
  return (
    <div className="flex">
      {zVisibleMapMarker.options.map((marker) => {
        const selected = visibleMarkers.includes(marker);
        const icon = iconForMarker(reactResources, marker);
        if (!icon) {
          return null;
        }
        return (
          <div
            key={marker}
            onClick={() => {
              if (selected) {
                setVisibleMarkers(visibleMarkers.filter((m) => m !== marker));
              } else {
                setVisibleMarkers([...visibleMarkers, marker]);
              }
            }}
            className="p-0.2"
          >
            <Tooltipped tooltip={capitalize(marker)}>
              <div
                className={`${selected ? "" : "opacity-25"} cell h-4 w-4 p-0.1`}
              >
                {icon}
              </div>
            </Tooltipped>
          </div>
        );
      })}
    </div>
  );
});
