import { useAvailableOrInProgressChallenges } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useNearbyAndTrackedPlayers } from "@/client/components/map/hooks";
import { MapLeftPaneQuestRow } from "@/client/components/map/pannable/MapLeftPaneQuestRow";
import { PannableMapLeftPaneQuestSheet } from "@/client/components/map/pannable/PannableMapQuestSheet";
import { PannableMapUserPane } from "@/client/components/map/pannable/PannableMapUserPane";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import type { QuestBundle } from "@/client/game/resources/challenges";
import { useCachedFollowIds } from "@/client/util/social_manager_hooks";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { MapSocialData } from "@/shared/types";
import { filterSet, take } from "@/shared/util/collections";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import pluralize from "pluralize";
import React, { useMemo, useState } from "react";
import type { VisibleMapMarker } from "@/client/util/typed_local_storage";
import { PannableMapVisibleMarkerSelection } from "@/client/components/map/pannable/PannableMapVisibleMarkerSelection";

export const PannableMapLeftPane: React.FunctionComponent<{
  socialData: MapSocialData;
  onChallengeClick?: (bundle: QuestBundle) => unknown;
  onChallengeDoubleClick?: (bundle: QuestBundle) => unknown;
  onPlayerClick?: (bundle: UserInfoBundle) => unknown;
  onPlayerDoubleClick?: (bundle: UserInfoBundle) => unknown;
  visibleMarkers: VisibleMapMarker[];
  setVisibleMarkers: (markers: VisibleMapMarker[]) => void;
}> = React.memo(
  ({
    onPlayerClick,
    onPlayerDoubleClick,
    onChallengeClick,
    onChallengeDoubleClick,
    visibleMarkers,
    setVisibleMarkers,
  }) => {
    const { socialManager, userId, reactResources } = useClientContext();
    const onlinePlayers =
      reactResources.use("/ecs/c/synthetic_stats", WorldMetadataId)
        ?.online_players ?? 1;
    const markers = useNearbyAndTrackedPlayers();
    const followedIds = new Set(useCachedFollowIds(socialManager, userId));

    const followedPlayers = filterSet(markers, (e) =>
      Boolean(followedIds?.has(e))
    );
    const unfollowedPlayers = filterSet(
      markers,
      (e) => !Boolean(followedIds?.has(e))
    );

    const facepile = take([...followedPlayers, ...unfollowedPlayers], 3);

    const relevantChallenges = useAvailableOrInProgressChallenges();

    const [mainQuests, skillQuests, puzzleQuests] = useMemo(() => {
      const mainQuests: QuestBundle[] = [];
      const skillQuests: QuestBundle[] = [];
      const puzzleQuests: QuestBundle[] = [];

      relevantChallenges
        .filter((challenge) => challenge.state === "in_progress")
        .map((challenge) => {
          switch (challenge.biscuit.questCategory) {
            case "main":
              mainQuests.push(challenge);
              break;
            case "puzzle":
              puzzleQuests.push(challenge);
              break;
            default:
              skillQuests.push(challenge);
              break;
          }
        });

      return [mainQuests, skillQuests, puzzleQuests];
    }, [relevantChallenges]);

    const [showQuestPane, setShowQuestPane] = useState<QuestBundle | undefined>(
      undefined
    );
    const [showUserPane, setShowUserPane] = useState(false);
    const tweaks = reactResources.use("/tweaks");

    return (
      <PaneLayout>
        {tweaks.mapIconFilters && (
          <PannableMapVisibleMarkerSelection
            visibleMarkers={visibleMarkers}
            setVisibleMarkers={setVisibleMarkers}
          />
        )}

        <PannableMapUserPane
          showUserPane={showUserPane}
          setShowUserPane={(v) => setShowUserPane(v)}
          onPlayerClick={onPlayerClick}
          onPlayerDoubleClick={onPlayerDoubleClick}
          followedPlayers={followedPlayers}
          unfollowedPlayers={unfollowedPlayers}
        />

        <PannableMapLeftPaneQuestSheet
          quest={showQuestPane}
          setQuest={setShowQuestPane}
        />
        <div className="padded-view">
          <div className="form">
            {mainQuests && mainQuests.length > 0 && (
              <section>
                <label>Main Quests</label>
                <ul className="challenge-list">
                  {mainQuests.map((e) => (
                    <MapLeftPaneQuestRow
                      onClick={() => {
                        setShowQuestPane(e);
                        onChallengeClick?.(e);
                      }}
                      key={`open-${e.biscuit.id}`}
                      challenge={e}
                    />
                  ))}
                </ul>
              </section>
            )}

            {skillQuests && skillQuests.length > 0 && (
              <section>
                <label>Skill Quests</label>
                <ul className="challenge-list">
                  {skillQuests.map((e) => (
                    <MapLeftPaneQuestRow
                      onClick={() => {
                        setShowQuestPane(e);
                        onChallengeClick?.(e);
                      }}
                      onDoubleClick={onChallengeDoubleClick}
                      key={`open-${e.biscuit.id}`}
                      challenge={e}
                    />
                  ))}
                </ul>
              </section>
            )}

            {puzzleQuests && puzzleQuests.length > 0 && (
              <section>
                <label>Puzzles</label>
                <ul className="challenge-list">
                  {puzzleQuests.map((e) => (
                    <MapLeftPaneQuestRow
                      onClick={() => {
                        setShowQuestPane(e);
                        onChallengeClick?.(e);
                      }}
                      onDoubleClick={onChallengeDoubleClick}
                      key={`open-${e.biscuit.id}`}
                      challenge={e}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
        <PaneBottomDock>
          <div
            className="flex cursor-pointer items-center justify-stretch px-0.6 py-0.2 font-semibold"
            onClick={() => setShowUserPane(true)}
          >
            <div className="flex-grow">
              <div>
                {onlinePlayers} {pluralize("Player", onlinePlayers)} Online
              </div>
            </div>
            {facepile.length > 0 && (
              <div className="flex gap-[-2vmin]">
                {facepile.map((playerId) => (
                  <EntityProfilePic key={playerId} entityId={playerId} />
                ))}
              </div>
            )}
          </div>
        </PaneBottomDock>
      </PaneLayout>
    );
  }
);
