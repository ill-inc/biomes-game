import {
  allCuratedFeedPosts,
  fetchCuratedFeedPostBundles,
} from "@/server/web/db/social";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zCuratedPostsFeed } from "@/shared/types";
import { z } from "zod";

export const zCurratedPhotosRequest = z.object({
  pagingToken: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(["approved", "not-approved", "any"]).optional(),
});

export const zCuratedPhotosResponse = z.object({
  feed: zCuratedPostsFeed,
});
export type PostStatus = z.infer<typeof zCurratedPhotosRequest>["status"];

export type CuratedPhotosResponse = z.infer<typeof zCuratedPhotosResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: zCurratedPhotosRequest,
    response: zCuratedPhotosResponse,
  },
  async ({
    context: { worldApi, db },
    query: { pagingToken, pageSize, status },
  }) => {
    const offset = parseInt(pagingToken ?? "0");
    const limit = parseInt(pageSize ?? "50");
    const [posts, newPagingToken] = await allCuratedFeedPosts(
      db,
      offset,
      limit,
      status
    );
    const bundles = await fetchCuratedFeedPostBundles(db, worldApi, ...posts);
    return {
      feed: {
        posts: bundles,
        pagingToken: newPagingToken,
      },
    };
  }
);
