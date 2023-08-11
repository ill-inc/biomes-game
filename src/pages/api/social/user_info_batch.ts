import { isFollowingMany } from "@/server/web/db/social";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import {
  biomesApiHandler,
  zQueryBiomesIds,
} from "@/server/web/util/api_middleware";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { zUserInfoBatchResponse } from "@/shared/util/fetch_bundles";
import { ok } from "assert";
import { zip } from "lodash";
import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      ids: zQueryBiomesIds,
    }),
    response: zUserInfoBatchResponse,
  },
  async ({ context: { db }, auth, query: { ids } }) => {
    const [userBundles, followingStatus] = await Promise.all([
      fetchUserBundlesByIds(db, ...ids),
      (async () => {
        if (auth?.userId) {
          return isFollowingMany(db, auth.userId, ids);
        } else {
          return Array(ids.length).fill(false);
        }
      })(),
    ]);

    const ret: Array<Readonly<UserInfoBundle> | null> = [];

    ok(userBundles.length === followingStatus.length);

    for (const [user, isFollowing] of zip(userBundles, followingStatus)) {
      if (user === undefined) {
        ret.push(null);
      } else {
        ret.push({
          user,
          isFollowing,
        });
      }
    }

    return ret;
  }
);
