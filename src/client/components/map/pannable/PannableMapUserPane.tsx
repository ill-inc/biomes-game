import { PlayerRow } from "@/client/components/map/pannable/PlayerRow";
import {
  PaneSlideover,
  PaneSlideoverTitleBar,
} from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import type { BiomesId } from "@/shared/ids";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import React from "react";

export const PannableMapUserPane: React.FunctionComponent<{
  showUserPane: boolean;
  setShowUserPane: (v: boolean) => unknown;
  followedPlayers: BiomesId[];
  unfollowedPlayers: BiomesId[];
  onPlayerClick?: (bundle: UserInfoBundle) => unknown;
  onPlayerDoubleClick?: (bundle: UserInfoBundle) => unknown;
}> = React.memo(
  ({
    showUserPane,
    setShowUserPane,
    followedPlayers,
    unfollowedPlayers,
    onPlayerClick,
    onPlayerDoubleClick,
  }) => {
    return (
      <PaneSlideover showing={showUserPane}>
        <PaneSlideoverTitleBar
          title="Online Friends"
          onClose={() => setShowUserPane(false)}
        />
        <div className="padded-view form">
          {followedPlayers.length > 0 && (
            <section>
              <label>Online Friends</label>
              <ul className="pannable-map-list-users">
                {followedPlayers.map((playerId) => (
                  <PlayerRow
                    key={playerId}
                    id={playerId}
                    onClick={onPlayerClick}
                    onDoubleClick={onPlayerDoubleClick}
                  />
                ))}
              </ul>
            </section>
          )}
          {unfollowedPlayers.length > 0 && (
            <section>
              <label>People Nearby</label>
              <ul className="pannable-map-list-users">
                {unfollowedPlayers.map((playerId) => (
                  <PlayerRow
                    key={playerId}
                    id={playerId}
                    onClick={onPlayerClick}
                    onDoubleClick={onPlayerDoubleClick}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </PaneSlideover>
    );
  }
);
