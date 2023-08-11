import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { useUserCanAction } from "@/client/util/permissions_manager_hooks";
import { UpdateVideoSettingsEvent } from "@/shared/ecs/gen/events";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";

export const VideoSettingsScreen: React.FunctionComponent<{
  placeableId: BiomesId;
}> = ({ placeableId }) => {
  const { events, reactResources, userId } = useClientContext();
  const playerRef = useRef<ReactPlayer>(null);
  const [videoComponent, placeableComponent] = reactResources.useAll(
    ["/ecs/c/video_component", placeableId],
    ["/ecs/c/placeable_component", placeableId]
  );
  const [videoUrl, setVideoUrl] = useState(videoComponent?.video_url ?? "");
  const [muted, setMuted] = useState(!!videoComponent?.muted);
  const canChange = useUserCanAction(placeableId, "destroy");

  useEffect(() => {
    setVideoUrl(videoComponent?.video_url ?? "");
    setMuted(!!videoComponent?.muted);
  }, [videoComponent]);

  const save = useCallback(() => {
    void (async () => {
      if (canChange) {
        await events.publish(
          new UpdateVideoSettingsEvent({
            id: placeableId,
            user_id: userId,
            video_url: videoUrl,
            muted,
          })
        );
      }
    })();

    reactResources.set("/game_modal", { kind: "empty" });
  }, [videoUrl, muted, placeableId]);

  return (
    <SplitPaneScreen>
      <ScreenTitleBar
        title={
          placeableComponent?.item_id
            ? anItem(placeableComponent?.item_id).displayName
            : "Video Settings"
        }
      />
      <LeftPane>
        <div className="padded-view-auto-height">
          <div className="dialog-button-group">
            <input
              type="text"
              placeholder="Video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <DialogCheckbox
              label="Mute"
              checked={muted}
              onCheck={(checked) => setMuted(checked)}
            />
          </div>
          <div className="dialog-text">
            <p>Supported URLs:</p>
            <ul className="bullet-points">
              <li>YouTube</li>
              <li>Facebook</li>
              <li>Twitch</li>
              <li>SoundCloud</li>
              <li>Streamable</li>
              <li>Vimeo</li>
              <li>Wistia</li>
              <li>Mixcloud</li>
              <li>DailyMotion</li>
              <li>Kaltura</li>
            </ul>
          </div>
        </div>
        <PaneBottomDock>
          <div className="dialog-button-group">
            <DialogButton type="primary" onClick={save}>
              Apply
            </DialogButton>
          </div>
        </PaneBottomDock>
      </LeftPane>
      <RightPane type="center_both">
        {videoUrl && (
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            playing={true}
            loop={true}
            width="400px"
            height="400px"
          />
        )}
      </RightPane>
    </SplitPaneScreen>
  );
};
