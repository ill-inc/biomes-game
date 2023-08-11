import { isFollowing } from "@/server/web/db/social";
import {
  fetchUserBundles,
  findUniqueByUsername,
} from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zResolveUsernameResponse } from "@/shared/util/fetch_bundles";
import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      username: z.string().min(1),
    }),
    response: zResolveUsernameResponse,
  },
  async ({ context: { db }, auth, query: { username } }) => {
    const user = await findUniqueByUsername(db, username);
    okOrAPIError(user, "not_found");
    const [userBundle, followingStatus] = await Promise.all([
      (async () => {
        return (await fetchUserBundles(db, user))[0];
      })(),
      (async () => {
        if (auth?.userId) {
          return isFollowing(db, auth.userId, user.id);
        } else {
          return false;
        }
      })(),
    ]);
    okOrAPIError(userBundle, "not_found");
    return {
      user: userBundle,
      isFollowing: followingStatus,
    };
  }
);
