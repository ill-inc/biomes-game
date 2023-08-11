import {
  allCuratedFeedPosts,
  fetchCuratedFeedPostBundles,
} from "@/server/web/db/social";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zCuratedFeedPostBundle } from "@/shared/types";
import _ from "lodash";
import { z } from "zod";

export const zFeaturedPostsRequest = z.object({
  count: z.string().optional(),
});

export const zFeaturedPostsResponse = z.object({
  posts: zCuratedFeedPostBundle.array(),
});

export type FeaturedPostsResponse = z.infer<typeof zFeaturedPostsResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: zFeaturedPostsRequest,
    response: zFeaturedPostsResponse,
  },
  async ({ context: { worldApi, db }, query: { count } }) => {
    const imageCount = parseInt(count ?? "100");

    const [posts] = await allCuratedFeedPosts(db, 0, 500, "approved");
    const bundles = await fetchCuratedFeedPostBundles(
      db,
      worldApi,
      ..._.shuffle(posts).slice(0, imageCount)
    );
    return {
      posts: bundles,
    };
  }
);
