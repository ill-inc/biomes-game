import { isFollowing } from "@/server/web/db/social";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import {
  biomesApiHandler,
  zQueryBiomesId,
} from "@/server/web/util/api_middleware";
import { APIError } from "@/shared/api/errors";
import { zUserInfoBundle } from "@/shared/util/fetch_bundles";
import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      userId: zQueryBiomesId,
    }),
    response: zUserInfoBundle,
  },
  async ({ context: { db }, auth, query: { userId } }) => {
    const [userBundle, followingStatus] = await Promise.all([
      (async () => {
        const user = (await fetchUserBundlesByIds(db, userId))[0];
        if (!user) {
          throw new APIError("not_found", "No user!");
        }
        return user;
      })(),
      (async () => {
        if (auth?.userId) {
          return isFollowing(db, auth.userId, userId);
        } else {
          return false;
        }
      })(),
    ]);
    return {
      user: userBundle,
      isFollowing: followingStatus,
    };
  }
);
