import { followers, followTargets } from "@/server/web/db/social";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import {
  biomesApiHandler,
  zQueryBiomesId,
  zQueryNumber,
} from "@/server/web/util/api_middleware";
import type { BiomesId } from "@/shared/ids";
import { zUserBundle } from "@/shared/types";
import { compact, take } from "lodash";
import { z } from "zod";

export const zFollowListRequest = z.object({
  userId: zQueryBiomesId,
  pagingToken: z.string().optional(),
  numToFetch: zQueryNumber.default(29),
  direction: z.enum(["outbound", "inbound"]),
});

export type FollowListRequest = z.infer<typeof zFollowListRequest>;

export const zFollowListResponse = z.object({
  users: z.array(zUserBundle),
  pagingToken: z.string().optional(),
});

export type FollowListResponse = z.infer<typeof zFollowListResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: zFollowListRequest,
    response: zFollowListResponse,
  },
  async ({
    context: { db },
    query: { userId, pagingToken, numToFetch, direction },
  }) => {
    okOrAPIError(numToFetch <= 500, "bad_param", "Too many fetched");

    const offset = pagingToken !== undefined ? parseInt(pagingToken) : 0;
    let userIds: BiomesId[] = [];
    if (direction === "inbound") {
      userIds = (
        await followers(db, userId, "desc", offset, numToFetch + 1)
      ).map((e) => e.id);
    } else {
      userIds = (
        await followTargets(db, userId, "desc", offset, numToFetch + 1)
      ).map((e) => e.id);
    }

    const newPagingToken =
      userIds.length > numToFetch ? String(offset + numToFetch) : undefined;
    userIds = take(userIds, numToFetch);

    const userBundles = await fetchUserBundlesByIds(db, ...userIds);

    return {
      users: compact(userBundles),
      pagingToken: newPagingToken,
    };
  }
);
