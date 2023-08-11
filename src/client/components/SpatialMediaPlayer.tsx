import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { VolumeSettingsType } from "@/client/game/context_managers/audio_manager";
import {
  SOUND_DEADZONE,
  SOUND_DISTANCE,
  SOUND_REF,
} from "@/client/game/scripts/audio";
import { useAnimation } from "@/client/util/animation";
import { useMountNearbyEntities } from "@/client/util/proximity";
import { AudioSourceSelector } from "@/shared/ecs/gen/selectors";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { dist } from "@/shared/math/linear";
import { clamp } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";

export const SpatialMediaPlayer: React.FunctionComponent<{
  entityId: BiomesId;
  volume: number;
  width: number;
  height: number;
  hidden?: boolean;
  // Whether to seek to consistent location across players / time.
  // That means theat the music box will not start at the beginning when encounterd.
  seekToTimeline?: boolean;
}> = React.memo(
  ({ entityId, volume, width, height, hidden, seekToTimeline }) => {
    const { reactResources, audioManager } = useClientContext();
    const playerRef = useRef<ReactPlayer>(null);
    const [videoDuration, setVideoDuration] = useState<number | undefined>();
    const [videoComponent, modal] = reactResources.useAll(
      ["/ecs/c/video_component", entityId],
      ["/game_modal"]
    );
    const [videoUrl, setVideoUrl] = useState<string | undefined>();
    const [spatialVolume, setSpatialVolume] = useState(0);
    const [muted, setMuted] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    // Mute the media when the modal is open.
    useEffect(() => {
      const newState =
        modal.kind === "generic_miniphone" &&
        modal.rootPayload.type === "change_video_settings";
      if (newState !== modalOpen) {
        setModalOpen(newState);
      }
    }, [modal]);

    // Set video URL when it changes.
    useEffect(() => {
      if (!videoComponent?.video_url) {
        return;
      }
      if (videoUrl !== videoComponent?.video_url) {
        setVideoUrl(videoComponent.video_url);
        setVideoDuration(undefined);
      }
    }, [videoComponent?.video_url]);

    // Calculate spatial volume.
    useAnimation(() => {
      if (
        !audioManager.isRunning() ||
        !playerRef.current?.getInternalPlayer()
      ) {
        return;
      }
      const position = reactResources.get("/ecs/c/position", entityId);
      const camera = reactResources.get("/scene/camera");

      if (!position) {
        return;
      }

      const d = dist(position.v, camera.pos());

      const calculateVolume = (dist: number) =>
        clamp(
          ((SOUND_REF + SOUND_DISTANCE - dist) / SOUND_DISTANCE) * volume,
          0,
          volume
        );
      setSpatialVolume(videoComponent?.muted ? 0 : calculateVolume(d));
    });

    // Mute the player when we don't have an audio context yet.
    useEffect(() => {
      if (playerRef.current?.getInternalPlayer()) {
        setSpatialVolume(spatialVolume);
      }
      setMuted(!audioManager.isRunning());
    }, [audioManager.isRunning()]);

    // Seek to the timeline.
    useEffect(() => {
      if (!seekToTimeline) {
        return;
      }
      if (videoUrl && videoDuration && videoComponent?.video_start_time) {
        const clock = reactResources.get("/clock");
        const seekTo =
          (clock.time - videoComponent.video_start_time) % videoDuration;
        playerRef.current?.seekTo(seekTo);
      }
    }, [videoUrl, videoComponent?.video_start_time, videoDuration]);

    if (!videoUrl || modalOpen) {
      return <></>;
    }

    return (
      <>
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={true}
          loop={true}
          controls={false}
          style={hidden ? { display: "none" } : {}}
          width={width}
          height={height}
          muted={muted}
          volume={spatialVolume}
          onDuration={(newDuration) => {
            if (newDuration && newDuration !== videoDuration) {
              setVideoDuration(newDuration);
            }
          }}
        />
      </>
    );
  }
);

export const SpatialMediaPlayers: React.FunctionComponent<{}> = ({}) => {
  const { table } = useClientContext();
  const volume = useVolume("settings.volume.media");

  const MOUNT_RADIUS = SOUND_REF + SOUND_DISTANCE;
  const UNMOUNT_RADIUS = SOUND_REF + SOUND_DISTANCE + SOUND_DEADZONE;

  const entityIds = useMountNearbyEntities(
    (cameraPos) =>
      [
        ...table.scan(
          AudioSourceSelector.query.spatial.inSphere({
            center: cameraPos,
            radius: UNMOUNT_RADIUS,
          })
        ),
      ].filter((entity) => {
        const item = anItem(entity.placeable_component.item_id);
        return !item.isCSS3DElement;
      }),
    MOUNT_RADIUS,
    UNMOUNT_RADIUS
  );

  return (
    <>
      {entityIds.map((id) => (
        <SpatialMediaPlayer
          entityId={id}
          key={id}
          volume={volume}
          width={400}
          height={400}
          hidden={true}
          seekToTimeline={true}
        />
      ))}
    </>
  );
};

export function useVolume(type: VolumeSettingsType) {
  const { audioManager } = useClientContext();
  const [volume, setVolume] = useState(audioManager.getVolume(type));

  useAnimation(() => {
    const v = audioManager.getVolume(type);
    if (v !== volume) {
      setVolume(v);
    }
  });

  return volume;
}
