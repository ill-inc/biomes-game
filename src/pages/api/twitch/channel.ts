import { zTwitchChannel } from "@/server/shared/twitch/types";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zTwitchChannelRequest = z.object({
  // Name of the channel.
  channel: z.string(),
});
export type TwitchChannelRequest = z.infer<typeof zTwitchChannelRequest>;

export const zTwitchChannelResponse = z.object({
  channel: zTwitchChannel.optional(),
});
export type TwitchChannelResponse = z.infer<typeof zTwitchChannelResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: zTwitchChannelRequest,
    response: zTwitchChannelResponse,
  },
  async ({ context: { twitchBot }, query: { channel } }) => {
    return { channel: await twitchBot.getChannel(channel) };
  }
);
