import { fetchEnvironmentGroupsCreatorFeed } from "@/server/web/db/environment_groups";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { zEnvironmentGroupBundleFeed } from "@/shared/types";
import { z } from "zod";

export const zUserGroupsCreatedResponse = z.object({
  groupsFeed: zEnvironmentGroupBundleFeed,
});

export type UserGroupsCreatedResponse = z.infer<
  typeof zUserGroupsCreatedResponse
>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      userId: zBiomesId,
      pagingToken: z.string().optional(),
    }),
    response: zUserGroupsCreatedResponse,
  },
  async ({ context: { db, worldApi }, query: { userId, pagingToken } }) => {
    const [groupsFeed] = await Promise.all([
      fetchEnvironmentGroupsCreatorFeed(db, worldApi, userId, pagingToken),
    ]);
    return {
      groupsFeed,
    };
  }
);
