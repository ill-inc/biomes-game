import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import PannableMapBase from "@/client/components/map/PannableMapBase";
import {
  MarkerZIndexes,
  getClientRenderPosition,
  pannableMapToWorldCoordinates,
  worldToPannableMapCoordinates,
} from "@/client/components/map/helpers";
import { usePlayerCreatedRobots } from "@/client/components/map/hooks";
import { PannableMapAdminRobotMarkers } from "@/client/components/map/markers/PannableMapAdminRobotMarkers";
import { PannableMapDeathMarker } from "@/client/components/map/markers/PannableMapDeathMarker";
import { PannableMapLandmarkLabels } from "@/client/components/map/markers/PannableMapLandmarkLabels";
import { PannableMapLocalPlayerMarker } from "@/client/components/map/markers/PannableMapLocalPlayerMarker";
import { PannableMapNavAidMarkers } from "@/client/components/map/markers/PannableMapNavigationAidMarker";
import { PannableMapOtherPlayerMarkers } from "@/client/components/map/markers/PannableMapOtherPlayerMarkers";
import { PannableMapRobotMarkers } from "@/client/components/map/markers/PannableMapRobotMarkers";
import { PannableMapLeftPane } from "@/client/components/map/pannable/PannableMapLeftPane";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { getClickIcon } from "@/client/components/system/ShortcutText";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneToolbarItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { QuestBundle } from "@/client/game/resources/challenges";
import { warpToPosition } from "@/client/game/util/warping";
import { cleanListener } from "@/client/util/helpers";
import { useLandmarks } from "@/client/util/map_hooks";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import type { Map as LMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import React, { useCallback, useEffect, useRef } from "react";
import { Pane } from "react-leaflet";
import editIcon from "/public/hud/icon-16-pencil.png";
import currentLocation from "/public/hud/icon-current-location-24.png";
import { useTypedStorageItem } from "@/client/util/typed_local_storage";
import { PannableMapMailboxMarkers } from "@/client/components/map/markers/PannableMapMailboxMarkers";

export const WorldPannableMapScreen: React.FunctionComponent<
  PropsWithChildren<{
    visibilityOverrides?: {
      deedMarkers?: boolean;
      leftDialog?: boolean;
    };
    initialState?: {
      zoom?: number;
    };
  }>
> = ({ visibilityOverrides, initialState, children }) => {
  const clientContext = useClientContext();
  const { mapManager, reactResources, input, authManager, resources } =
    clientContext;
  const [error, _setError] = useError();
  const [mapLoading, mapData] = mapManager.react.useMapMetadata();
  const map = useRef<LMap | null>(null);
  const miniPhoneContext = useExistingMiniPhoneContext();
  const landmarks = useLandmarks(clientContext);
  const [visibleMarkers, setVisibleMarkers] = useTypedStorageItem(
    "settings.map.visibleMarkers",
    ["robot", "players", "quests", "mailboxes"]
  );
  const visibleMarkerSet = useMemo(
    () => new Set(visibleMarkers),
    [visibleMarkers]
  );

  const [adminRobots, setAdminRobots] = React.useState(false);

  const isAdmin = authManager.currentUser.hasSpecialRole("admin");

  useEffect(() => {
    mapManager.loadMapMetadata();
  }, []);

  // Hacky, intercept click on profile map marker to pop up profile
  useEffect(
    () =>
      cleanListener(document, {
        click: (ev) => {
          const target = ev.target;
          if (target && (target as HTMLElement).attributes) {
            const userId = (target as HTMLElement).attributes.getNamedItem(
              "data-user-id"
            );
            if (userId?.value) {
              miniPhoneContext.pushNavigationStack({
                type: "profile",
                userId: parseBiomesId(userId.value),
              });
            }
          }
        },
      }),
    []
  );

  const challengeMarkerCallback = useCallback((_bundle: QuestBundle) => {}, []);

  const challengeDialogCallback = useCallback((bundle: QuestBundle) => {
    const pos = mapManager.navAidPositionForChallengeId(bundle.biscuit.id);
    if (!pos) return;
    map.current?.panTo(worldToPannableMapCoordinates(pos));
  }, []);

  const robotDialogCallback = useCallback((robotId: BiomesId) => {
    const robotPosition = getClientRenderPosition(resources, robotId);
    map.current?.panTo(worldToPannableMapCoordinates(robotPosition));
  }, []);

  const playerMarkerCallback = useCallback((bundle: UserInfoBundle) => {
    miniPhoneContext.pushNavigationStack({
      type: "profile",
      userId: bundle.user.id,
    });
  }, []);
  const playerDialogCallback = useCallback((bundle: UserInfoBundle) => {
    const pos = getClientRenderPosition(resources, bundle.user.id);
    if (!pos) {
      return;
    }
    map.current?.panTo(worldToPannableMapCoordinates(pos));
  }, []);

  const currentLocationCallback = useCallback(() => {
    const localPlayer = reactResources.get("/scene/local_player");
    map.current?.panTo(
      worldToPannableMapCoordinates(localPlayer.player.position)
    );
  }, []);

  // Control click to teleport for admins
  const teleportCallback = useCallback(
    (map: LMap) => {
      if (!isAdmin) {
        return;
      }

      map.on("mouseup", (ev) => {
        if (ev.originalEvent.ctrlKey) {
          const pos = pannableMapToWorldCoordinates([
            ev.latlng.lat,
            ev.latlng.lng,
          ]);
          void warpToPosition(clientContext, [pos[0], 200, pos[1]]);

          // Close this modal
          reactResources.set("/game_modal", {
            kind: "empty",
          });
        }
      });
    },
    [reactResources, input]
  );

  const robots = usePlayerCreatedRobots(1);

  if (error) {
    return (
      <div>
        <MaybeError error={error} />
      </div>
    );
  } else if (mapLoading && !mapData) {
    return <div>Map Loading</div>;
  } else if (!mapData) {
    return <div>Bad state</div>;
  }

  return (
    <SplitPaneScreen extraClassName="pannable-map-container">
      <ScreenTitleBar title="Map & Quests">
        {isAdmin && (
          <RightBarItem>
            <MiniPhoneToolbarItem
              src={editIcon.src}
              extraClassNames={adminRobots ? "" : "opacity-30"}
              tooltip="Edit Admin Robots"
              onClick={() => {
                setAdminRobots(!adminRobots);
              }}
            />
          </RightBarItem>
        )}
      </ScreenTitleBar>
      <RawLeftPane>
        <PannableMapLeftPane
          socialData={mapData.socialData}
          onChallengeClick={challengeDialogCallback}
          onChallengeDoubleClick={challengeMarkerCallback}
          onPlayerClick={playerDialogCallback}
          onPlayerDoubleClick={playerMarkerCallback}
          visibleMarkers={visibleMarkers}
          setVisibleMarkers={setVisibleMarkers}
        />
      </RawLeftPane>
      <RightPane type="center">
        <div className="pannable-map-container">
          <div className="map">
            <PannableMapBase
              initialState={initialState}
              mapRef={map}
              init={teleportCallback}
            >
              <Pane
                name="cluster-nav-aids"
                style={{ zIndex: MarkerZIndexes.NAVIGATION_BEAMS }}
              />

              <div className="absolute bottom-[1.25vmin] left-1 z-[100000] flex items-center gap-0.4 text-sm text-white opacity-75 text-shadow-[var(--text-bordered-light)]">
                <img
                  className="w-[1.75vmin] filter-image-stroke"
                  src={getClickIcon("secondary")}
                />
                Right Click to Add Marker
              </div>

              <div className="absolute bottom-1 right-1 z-[100000] flex flex-col gap-0.8">
                {robots && (
                  <>
                    {Array.from(robots).map((robotId) => (
                      <DialogButton
                        key={robotId}
                        extraClassNames="current-location-button biomes-box"
                        onClick={() => {
                          robotDialogCallback(robotId);
                        }}
                      >
                        <EntityProfilePic entityId={robotId} />
                      </DialogButton>
                    ))}
                  </>
                )}
                <DialogButton
                  extraClassNames="current-location-button biomes-box"
                  onClick={() => {
                    currentLocationCallback();
                  }}
                >
                  <img src={currentLocation.src} />
                </DialogButton>
              </div>

              {adminRobots ? (
                <PannableMapAdminRobotMarkers />
              ) : (
                <>
                  {visibilityOverrides?.deedMarkers !== false && (
                    <>
                      <PannableMapLandmarkLabels landmarks={landmarks} />
                    </>
                  )}
                  {visibleMarkerSet.has("players") && (
                    <PannableMapOtherPlayerMarkers
                      onClick={playerMarkerCallback}
                    />
                  )}
                  {visibleMarkerSet.has("quests") && (
                    <PannableMapNavAidMarkers
                      challengeMarkerCallback={challengeMarkerCallback}
                    />
                  )}
                  {visibleMarkerSet.has("robot") && <PannableMapRobotMarkers />}
                  {visibleMarkerSet.has("mailboxes") && (
                    <PannableMapMailboxMarkers />
                  )}
                  <PannableMapDeathMarker />
                </>
              )}

              <PannableMapLocalPlayerMarker />
              {children}
            </PannableMapBase>
          </div>
        </div>
      </RightPane>
    </SplitPaneScreen>
  );
};

export default WorldPannableMapScreen;
