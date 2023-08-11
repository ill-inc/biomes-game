import type { SendMessageRequest } from "@/server/shared/chat/api";
import { setLikeDocument } from "@/server/web/db/likes";
import { feedPostById, fetchFeedPostBundle } from "@/server/web/db/social";
import type { FirestoreFeedPost, WithId } from "@/server/web/db/types";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { postLikeToDiscord } from "@/server/web/util/discord";
import type { LikeMessage } from "@/shared/chat/messages";
import { toStoredEntityId, zBiomesId } from "@/shared/ids";
import { zFeedPostBundle } from "@/shared/types";
import { z } from "zod";

export const zLikePostResponse = z.object({
  feedPostBundle: zFeedPostBundle,
});

export type LikePostResponse = z.infer<typeof zLikePostResponse>;

export const zLikePostRequest = z.object({
  postId: zBiomesId,
  isLiked: z.boolean(),
});

export type LikePostRequest = z.infer<typeof zLikePostRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zLikePostRequest,
    response: zLikePostResponse,
  },
  async ({ context, auth: { userId }, body: { postId, isLiked } }) => {
    const { db, firehose, worldApi, chatApi } = context;
    let feedPost: WithId<FirestoreFeedPost>;
    try {
      feedPost = await setLikeDocument(
        db,
        userId,
        db.collection("feed-posts").doc(toStoredEntityId(postId)),
        isLiked
      );
    } catch (error: any) {
      if (error?.code === 6) {
        // already exists, ignore
        feedPost = (await feedPostById(db, postId))!;
      } else {
        throw error;
      }
    }

    const message: SendMessageRequest = {
      channel: "activity",
      to: feedPost.userId,
      from: userId,
      message: <LikeMessage>{
        kind: "like",
        documentType: "post",
        documentId: feedPost.id,
      },
    };

    // Send notifications
    if (isLiked) {
      await Promise.all([
        (async () => {
          if (feedPost.userId !== userId || CONFIG.allowPushForSelfActivity) {
            await chatApi.sendMessage(message);
          }
        })(),
        firehose.publish({
          kind: "like",
          entityId: userId,
        }),
        firehose.publish({
          kind: "receiveLike",
          entityId: feedPost.userId,
        }),
      ]);
      void postLikeToDiscord(context, userId, feedPost);
    } else {
      await chatApi.unsendMessage(message);
    }

    const bundle = await fetchFeedPostBundle(db, worldApi, feedPost, userId);
    return { feedPostBundle: bundle };
  }
);
