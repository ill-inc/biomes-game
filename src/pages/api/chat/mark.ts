import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zWatermarkMessageKinds } from "@/shared/chat/messages";
import { zChannelName } from "@/shared/chat/types";
import { z } from "zod";

export const zMarkRequest = z.object({
  kinds: zWatermarkMessageKinds.array(),
  channel: zChannelName,
  timestamp: z.number(),
});

export type MarkRequest = z.infer<typeof zMarkRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zMarkRequest,
  },
  async ({
    context: { chatApi },
    auth: { userId },
    body: { kinds, channel, timestamp },
  }) => {
    if (channel !== "activity") {
      // Not supported yet.
      return;
    }
    await Promise.all(
      kinds.map((kind) =>
        chatApi.sendMessage({
          localTime: timestamp,
          channel,
          from: userId,
          message: {
            kind: kind,
          },
        })
      )
    );
  }
);
