import { fetchFeedPostBundleById } from "@/server/web/db/social";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { zPostResponse } from "@/shared/util/fetch_bundles";
import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      postId: zBiomesId,
    }),
    response: zPostResponse,
  },
  async ({ context: { db, worldApi }, auth, query: { postId } }) => {
    const post = await fetchFeedPostBundleById(
      db,
      worldApi,
      postId,
      auth?.userId
    );
    okOrAPIError(post, "not_found");
    return {
      post,
    };
  }
);
