import { fetchUserFeed } from "@/server/web/db/social";
import {
  biomesApiHandler,
  zQueryBiomesId,
} from "@/server/web/util/api_middleware";
import { zPostsFeed } from "@/shared/types";
import { z } from "zod";

export const zUserPhotosResponse = z.object({
  postsFeed: zPostsFeed,
});

export type UserPhotosResponse = z.infer<typeof zUserPhotosResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      userId: zQueryBiomesId,
      pagingToken: z.string().optional(),
    }),
    response: zUserPhotosResponse,
  },
  async ({
    context: { db, firehose, worldApi },
    auth,
    query: { userId, pagingToken },
  }) => {
    const [postsFeed] = await Promise.all([
      fetchUserFeed(db, worldApi, userId, pagingToken, auth?.userId),
      (async () => {
        if (auth?.userId && auth?.userId !== userId) {
          return firehose.publish({
            kind: "inspectPlayer",
            entityId: auth.userId,
          });
        } else {
          return;
        }
      })(),
    ]);
    return {
      postsFeed,
    };
  }
);
