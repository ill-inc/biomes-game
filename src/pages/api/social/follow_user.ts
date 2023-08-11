import { setFollow } from "@/server/web/db/social";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { postFollowToDiscord } from "@/server/web/util/discord";
import type { FollowUserMessage } from "@/shared/chat/messages";
import type { ChannelName } from "@/shared/chat/types";
import { zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { z } from "zod";

export const zFollowUserRequest = z.object({
  targetId: zBiomesId,
  isFollow: z.boolean(),
});

export type FollowUserRequest = z.infer<typeof zFollowUserRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zFollowUserRequest,
  },
  async ({ context, auth: { userId }, body: { targetId, isFollow } }) => {
    const { db, firehose, chatApi } = context;
    await setFollow(db, userId, targetId, isFollow);

    const message = {
      channel: "activity" as ChannelName,
      to: targetId,
      from: userId,
      message: <FollowUserMessage>{
        kind: "follow",
        targetId: targetId,
      },
    };

    // Send notifications
    if (isFollow) {
      await Promise.all([
        chatApi.sendMessage(message),
        firehose.publish({
          kind: "follow",
          entityId: userId,
        }),
      ]);
      fireAndForget(
        postFollowToDiscord(context, userId, targetId).catch((error) => {
          log.warn("Could not post follow to Discord", { error });
        })
      );
    } else {
      await chatApi.unsendMessage(message);
    }
  }
);
