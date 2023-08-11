import { GameEvent } from "@/server/shared/api/game_event";
import {
  feedPostById,
  fetchFeedPostBundle,
  setWarpToDocument,
} from "@/server/web/db/social";
import type { FirestoreFeedPost, WithId } from "@/server/web/db/types";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WarpEvent } from "@/shared/ecs/gen/events";
import type { Vec2f } from "@/shared/ecs/gen/types";
import { zVec2f, zVec3f } from "@/shared/ecs/gen/types";
import { calculateWarpFee, calculateWarpRoyalty } from "@/shared/game/costs";
import { toStoredEntityId, zBiomesId } from "@/shared/ids";
import { pitchAndYaw } from "@/shared/math/linear";
import { zFeedPostBundle } from "@/shared/types";
import { z } from "zod";

export const zWarpPostResponse = z.object({
  feedPostBundle: zFeedPostBundle,
  position: zVec3f,
  orientation: zVec2f.optional(),
});

export type WarpPostResponse = z.infer<typeof zWarpPostResponse>;

export const zWarpPostRequest = z.object({
  postId: zBiomesId,
});

export type WarpPostRequest = z.infer<typeof zWarpPostRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zWarpPostRequest,
    response: zWarpPostResponse,
  },
  async ({
    context: { db, firehose, logicApi, worldApi, chatApi },
    auth: { userId },
    body: { postId },
  }) => {
    let feedPost: WithId<FirestoreFeedPost> | null = await feedPostById(
      db,
      postId
    );

    okOrAPIError(feedPost, "not_found", `Photo ${postId} not found`);
    const coords = feedPost?.media?.[0].metadata?.coordinates;
    okOrAPIError(coords, "invalid_request", `Photo ${postId} is not warpable`);
    const player = await worldApi.get(userId);
    okOrAPIError(
      player && player.hasPosition(),
      "invalid_request",
      "No Player"
    );

    const cost = calculateWarpFee(player.position().v, coords);
    const royalty = calculateWarpRoyalty(cost);

    try {
      feedPost = await setWarpToDocument(
        db,
        userId,
        db.collection("feed-posts").doc(toStoredEntityId(postId))
      );
    } catch (error: any) {
      if (error?.code === 6) {
        // already exists, ignore
      } else {
        throw error;
      }
    }

    let orientation: undefined | Vec2f;

    if (feedPost?.media?.[0]?.metadata?.cameraLookAt) {
      orientation = pitchAndYaw(feedPost.media?.[0].metadata?.cameraLookAt);
    }

    await logicApi.publish(
      new GameEvent(
        userId,
        new WarpEvent({
          id: userId,
          position: coords,
          orientation,
          cost,
          royalty: calculateWarpRoyalty(cost),
          royaltyTarget: feedPost.userId,
        })
      )
    );

    const [bundle] = await Promise.all([
      fetchFeedPostBundle(db, worldApi, feedPost, userId),
      (async () => {
        if (feedPost.userId !== userId || CONFIG.allowPushForSelfActivity) {
          await chatApi.sendMessage({
            channel: "activity",
            to: feedPost.userId,
            from: userId,
            message: {
              kind: "royalty",
              documentType: "post",
              documentId: feedPost.id,
              royalty,
            },
          });
        }
      })(),
      firehose.publish({
        kind: "warp",
        entityId: userId,
      }),
      firehose.publish({
        kind: "warpPost",
        entityId: userId,
        postId: feedPost.id,
      }),
    ]);
    return {
      feedPostBundle: bundle,
      position: coords,
      orientation: orientation,
    };
  }
);
