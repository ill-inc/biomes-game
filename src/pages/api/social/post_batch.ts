import { fetchFeedPostBundlesByIds } from "@/server/web/db/social";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { compactMap } from "@/shared/util/collections";
import {
  zPostBatchRequest,
  zPostBatchResponse,
} from "@/shared/util/fetch_bundles";

export default biomesApiHandler(
  {
    auth: "optional",
    body: zPostBatchRequest,
    response: zPostBatchResponse,
  },
  async ({ context: { db, worldApi }, auth, body: { ids } }) => {
    const posts = await fetchFeedPostBundlesByIds(
      db,
      worldApi,
      ids,
      auth?.userId
    );
    const map = new Map(compactMap(posts, (p) => (p ? [p.id, p] : undefined)));
    return {
      posts: ids.map((id) => map.get(id)),
    };
  }
);
