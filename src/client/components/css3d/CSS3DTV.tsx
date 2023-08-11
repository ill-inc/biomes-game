import {
  SpatialMediaPlayer,
  useVolume,
} from "@/client/components/SpatialMediaPlayer";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ThumbnailImage } from "@/client/components/css3d/ThumbnailImage";
import { useCSS3DRefCallback } from "@/client/components/css3d/helpers";
import { useScreenshotter } from "@/client/game/helpers/screenshot";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { getThumbnailFromUrl } from "@/shared/media";
import React, { useEffect, useMemo, useState } from "react";

export const CSS3DTV: React.FunctionComponent<{
  entityId: BiomesId;
}> = React.memo(({ entityId }) => {
  const context = useClientContext();
  const { reactResources } = context;
  const css3d = useCSS3DRefCallback(reactResources, entityId);
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const videoComponent = reactResources.use("/ecs/c/video_component", entityId);
  const { screenshotting } = useScreenshotter(context);

  const placeableComponent = reactResources.use(
    "/ecs/c/placeable_component",
    entityId
  );

  const [width, height] = useMemo(() => {
    const boxSize = anItem(placeableComponent?.item_id)?.boxSize;
    const height = boxSize?.[1] ?? 1;
    const width = boxSize?.[2] ?? 1;
    return [width, height];
  }, [entityId]);

  // Set video URL when it changes.
  useEffect(() => {
    if (!videoComponent?.video_url) {
      return;
    }
    if (videoUrl !== videoComponent?.video_url) {
      setVideoUrl(videoComponent.video_url);
    }
  }, [videoComponent?.video_url]);

  const thumbnailUrl = videoUrl ? getThumbnailFromUrl(videoUrl) : undefined;
  const volume = useVolume("settings.volume.media");
  const showThumbnail = thumbnailUrl !== undefined && screenshotting;

  return (
    <div
      ref={css3d}
      className="css3d-tv bg-black"
      style={{ width: `${width * 100}px`, height: `${height * 100}px` }}
    >
      <ThumbnailImage
        show={showThumbnail}
        width={width * 100}
        height={height * 100}
        url={thumbnailUrl}
      />
      <SpatialMediaPlayer
        entityId={entityId}
        volume={volume}
        width={width * 100}
        height={height * 100}
        seekToTimeline={true}
      />
    </div>
  );
});
