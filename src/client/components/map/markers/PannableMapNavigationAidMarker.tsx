import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  getNavigationAidAsset,
  MarkerZIndexes,
  pannableMapToWorldCoordinates,
  SINGLETON_NAVIGATION_BEAM_ID,
  world2ToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { useMapEdgePositionAngle } from "@/client/components/map/leaflet_helpers";
import type { NavigationAid } from "@/client/game/helpers/navigation_aids";
import type { QuestBundle } from "@/client/game/resources/challenges";
import { filterMap, mapMap } from "@/shared/util/collections";
import type { DivIcon } from "leaflet";
import { divIcon } from "leaflet";
import { floor } from "lodash";
import React, { useMemo } from "react";
import { Marker } from "react-leaflet";
import navigationMarkerArrow from "/public/hud/nav-aid-pointer-quest-side.png";

export const PannableMapNavAidMarkers: React.FunctionComponent<{
  challengeMarkerCallback: (quest: QuestBundle) => unknown;
}> = ({ challengeMarkerCallback }) => {
  const { mapManager } = useClientContext();

  const allNavAids = mapManager.react.useNavigationAids();
  const navAids = filterMap(
    allNavAids,
    (navAid) => navAid.target.kind !== "robot"
  );

  const [trackedQuestId] = mapManager.react.useTrackedQuestId();
  const untrackedNavAids = filterMap(navAids, (navAid) => {
    if (!navAid.challengeId) return false;
    return navAid.challengeId !== trackedQuestId;
  });

  const trackedNavAids = filterMap(navAids, (navAid) => {
    if (navAid.kind == "placed") return true;
    if (!navAid.challengeId) return false;
    return navAid.challengeId === trackedQuestId;
  });

  return (
    <>
      <PannableMapNavigationAidClusters
        navigationAids={untrackedNavAids}
        onClick={challengeMarkerCallback}
      />

      {mapMap(trackedNavAids, (aid) => (
        <PannableMapNavigationMarker
          key={aid.id}
          navigationAid={aid}
          onClick={challengeMarkerCallback}
        />
      ))}
    </>
  );
};

export const PannableMapNavigationAidClusters: React.FunctionComponent<{
  navigationAids: Map<number, NavigationAid>;
  onClick?: (challenge: QuestBundle) => unknown;
}> = React.memo(({ navigationAids, onClick }) => {
  return (
    <>
      {mapMap(navigationAids, (aid) => (
        <PannableMapNavigationMarker
          navigationAid={aid}
          key={aid.id}
          onClick={onClick}
        />
      ))}
    </>
  );
});

const NAV_AID_WIDTH = 32;

export function navAidIconDiv(
  navigationAid: NavigationAid,
  challenge?: QuestBundle,
  arrow?: string,
  customTooltip?: string
) {
  const image = getNavigationAidAsset(navigationAid, challenge);
  let tooltipText = "";
  if (customTooltip !== undefined) {
    tooltipText = customTooltip;
  } else if (navigationAid.kind == "placed") {
    tooltipText = "Click to Remove";
  } else if (challenge?.state == "in_progress") {
    tooltipText = challenge.biscuit.displayName;
  } else if (challenge?.biscuit.isSideQuest) {
    tooltipText = "Side Quest";
  } else {
    tooltipText = challenge?.biscuit.displayName ?? "Quest";
  }
  const tooltip =
    tooltipText !== ""
      ? `<div class="tooltip-content">
          <div class="username">${tooltipText}</div>
        </div>`
      : ``;
  const html = `
      <div class="marker-wrapper">
        <div class="items">
        ${tooltip}
        <div
          class="marker"
        ><img src="${image}" class="w-2.5 h-2.5" /></div>
        ${arrow || ""}
        </div>
      </div>`;
  return divIcon({
    iconSize: [NAV_AID_WIDTH, NAV_AID_WIDTH],
    iconAnchor: [NAV_AID_WIDTH / 2, NAV_AID_WIDTH / 2],
    className: "local-marker",
    html,
  });
}

export const PannableMapNavigationBeamMarkerBase: React.FunctionComponent<{
  position: [number, number];
  icon: DivIcon;
  navigationAid: NavigationAid;
  onClick?: (bundle: QuestBundle) => unknown;
}> = ({ position, icon, navigationAid, onClick }) => {
  const { mapManager, reactResources } = useClientContext();
  const challenge = navigationAid.challengeId
    ? reactResources.useResolved("/quest", navigationAid.challengeId)
    : undefined;
  return (
    <Marker
      position={world2ToPannableMapCoordinates(position)}
      icon={icon}
      draggable={navigationAid.kind == "placed"}
      zIndexOffset={MarkerZIndexes.NAVIGATION_BEAMS}
      eventHandlers={{
        contextmenu: () => {
          if (navigationAid.kind == "placed") {
            mapManager.removeNavigationAid(navigationAid.id);
          }
        },
        click: () => {
          if (navigationAid.kind == "placed") {
            mapManager.removeNavigationAid(navigationAid.id);
          } else if (challenge) {
            onClick?.(challenge);
          }
        },
        dragend: (e) => {
          mapManager.removeNavigationAid(SINGLETON_NAVIGATION_BEAM_ID);
          mapManager.addNavigationAid(
            {
              kind: "placed",
              autoremoveWhenNear: true,
              target: {
                kind: "pos2d",
                position: pannableMapToWorldCoordinates([
                  e.target._latlng.lat,
                  e.target._latlng.lng,
                ]),
              },
            },
            SINGLETON_NAVIGATION_BEAM_ID
          );
        },
      }}
    />
  );
};

export const PannableMapNavigationMarker: React.FunctionComponent<{
  navigationAid: NavigationAid;
  onClick?: (bundle: QuestBundle) => unknown;
}> = React.memo(({ navigationAid, onClick }) => {
  const { reactResources } = useClientContext();

  const challenge = navigationAid.challengeId
    ? reactResources.useResolved("/quest", navigationAid.challengeId)
    : undefined;

  const icon = useMemo(() => {
    return navAidIconDiv(navigationAid, challenge);
  }, [navigationAid, challenge]);

  return (
    <PannableMapNavigationBeamMarkerBase
      position={[navigationAid.pos[0], navigationAid.pos[2]]}
      icon={icon}
      navigationAid={navigationAid}
      onClick={onClick}
    />
  );
});

export const PannableMapNavigationPinnedMarker: React.FunctionComponent<{
  navigationAid: NavigationAid;
  onClick?: (bundle: QuestBundle) => unknown;
}> = React.memo(({ navigationAid, onClick }) => {
  const { mapManager, reactResources } = useClientContext();
  const [tracked] = mapManager.react.useTrackingQuestStatus(
    navigationAid.challengeId
  );
  const [worldPosition, angle] = useMapEdgePositionAngle(
    navigationAid.pos,
    NAV_AID_WIDTH + 24,
    tracked
  );

  const arrow = useMemo(() => {
    if (angle === undefined) {
      return "";
    }
    return `
      <div
        class="map-edge-arrow"
        style="transform: rotate(${angle}rad)"
      >
        <img src=${navigationMarkerArrow.src} />
      </div>`;
    // floor() to prevent frequent re-renders; they will flicker if too often
  }, [angle && floor(angle * 10)]);

  const challenge = navigationAid.challengeId
    ? reactResources.useResolved("/quest", navigationAid.challengeId)
    : undefined;

  const icon = useMemo(() => {
    return navAidIconDiv(navigationAid, challenge, arrow);
  }, [navigationAid, challenge, arrow]);

  return (
    <PannableMapNavigationBeamMarkerBase
      position={worldPosition}
      icon={icon}
      navigationAid={navigationAid}
      onClick={onClick}
    />
  );
});
