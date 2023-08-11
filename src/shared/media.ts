// ChatGPT magic.
const YOUTUBE_VIDEO_ID_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/[^\/?]+\S+|channel\/[^\/?]+\S+)|youtu\.be\/)([^\/?&]{11})$/;
const TWITCH_CHANNEL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{4,25})(?:\/\S+)?$/;
const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/[^\/?]+\S+|channel\/[^\/?]+\S+)|youtu\.be\/)([^\/?&]{11})$/;
const TWITCH_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{4,25})$/;

type VideoSource = "youtube" | "twitch";

function getYoutubeVideoIdFromSrc(src: string): string | undefined {
  const match = RegExp(YOUTUBE_VIDEO_ID_REGEX).exec(src);
  return match ? match[1] : undefined;
}

function getTwitchChannelFromStreamUrl(url: string): string | undefined {
  const match = RegExp(TWITCH_CHANNEL_REGEX).exec(url);
  return match ? match[1] : undefined;
}

function getVideoSource(src: string): VideoSource | undefined {
  if (YOUTUBE_REGEX.test(src)) {
    return "youtube";
  } else if (TWITCH_REGEX.test(src)) {
    return "twitch";
  }
}

export function getThumbnailFromUrl(src: string): string | undefined {
  switch (getVideoSource(src)) {
    case "youtube": {
      const videoId = getYoutubeVideoIdFromSrc(src);
      if (videoId === undefined) {
        return;
      }
      const params = new URLSearchParams();
      params.set("kind", "youtube");
      params.set("videoId", videoId);
      return `/api/media/images?${params.toString()}`;
    }
    case "twitch": {
      const channel = getTwitchChannelFromStreamUrl(src);
      if (channel === undefined) {
        return;
      }
      const params = new URLSearchParams();
      params.set("kind", "twitch");
      params.set("channel", channel);
      return `/api/media/images?${params.toString()}`;
    }
  }
}
