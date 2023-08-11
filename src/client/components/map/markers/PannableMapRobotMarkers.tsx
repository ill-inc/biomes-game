import { useAvailableRobotSteps } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { iconUrl } from "@/client/components/inventory/icons";
import {
  MarkerZIndexes,
  worldToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import {
  useClientRenderPosition,
  usePlayerCreatedRobots,
} from "@/client/components/map/hooks";
import { useCachedUsername } from "@/client/util/social_manager_hooks";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { mapSet } from "@/shared/util/collections";
import { divIcon } from "leaflet";
import React, { useMemo } from "react";
import { Marker } from "react-leaflet";
import robotTransmissionQuestMarkSmall from "/public/quests/quest-balloon-exclaim-small.png";

export const PannableRobotMarker: React.FunctionComponent<{
  robotId: BiomesId;
}> = React.memo(({ robotId }) => {
  const { reactResources } = useClientContext();
  const createdBy = reactResources.use("/ecs/c/created_by", robotId);
  const robotName = reactResources.use("/ecs/c/label", robotId);
  const userName = useCachedUsername(createdBy?.id);
  const label = `${robotName?.text ?? "robot"} ${
    userName ? `owned by ${userName}` : ""
  }`;
  const url = iconUrl(anItem(BikkieIds.biomesRobot));

  const robotSteps = useAvailableRobotSteps();
  const pos = useClientRenderPosition(robotId);

  const icon = useMemo(
    () =>
      divIcon({
        className: "marker-wrapper",
        iconSize: [40, 40],
        iconAnchor: [40 / 2, 40 / 2],
        html: `<div class="items">
                  <div class="tooltip-content">
                    <div class="username">${label}</div>
                  </div>
                  <div class="marker">
                    <img class="avatar fixed filter-image-stroke" src="${url}" />
                    ${
                      robotSteps.length > 0
                        ? `

                        <img class="z-1 fixed translate-x-[50%] translate-y-[-50%] w-[24px] h-[24px]" src="${robotTransmissionQuestMarkSmall.src}" />`
                        : ""
                    }
                  </div>
              </div>`,
      }),
    [label, url, robotSteps.length]
  );

  if (!pos) {
    return <></>;
  }

  return (
    <Marker
      position={worldToPannableMapCoordinates(pos)}
      icon={icon}
      zIndexOffset={MarkerZIndexes.ROBOTS}
    />
  );
});

export const PannableMapRobotMarkers: React.FunctionComponent<{}> = ({}) => {
  const createdByPlayer = usePlayerCreatedRobots();

  return (
    <>
      {mapSet(createdByPlayer, (robotId) => (
        <PannableRobotMarker key={robotId} robotId={robotId} />
      ))}
    </>
  );
};
