import { prettyFishLength } from "@/client/components/chat/CatchMessageView";
import type {
  LeaderboardCategory,
  LeaderboardOrder,
  LeaderboardWindow,
} from "@/server/shared/world/api";
import { zLeaderboardWindow } from "@/server/shared/world/api";
import type { WebServerContext } from "@/server/web/context";
import { fetchGroupDetailBundlesByIds } from "@/server/web/db/environment_groups";
import {
  mostFollowed,
  topEnvironmentGroups,
  topFeedPosts,
} from "@/server/web/db/leaderboards";
import { fetchFeedPostBundles } from "@/server/web/db/social";
import {
  fetchUserBundles,
  fetchUserBundlesByIds,
} from "@/server/web/db/users_fetch";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import type { BiomesId } from "@/shared/ids";
import pluralize from "@/shared/plural";
import type { UserBundle } from "@/shared/types";
import {
  zFeedPostBundle,
  zGroupDetailBundle,
  zUserBundle,
} from "@/shared/types";
import { mapSet } from "@/shared/util/collections";
import { compact } from "lodash";
import { z } from "zod";

export const zUsersLeaderboard = z.object({
  kind: z.literal("users"),
  label: z.string(),
  data: z
    .object({
      user: zUserBundle,
      flavorText: z.string(),
    })
    .array(),
});

export const zPostsLeaderboard = z.object({
  kind: z.literal("posts"),
  label: z.string(),
  data: z
    .object({
      post: zFeedPostBundle,
      flavorText: z.string(),
    })
    .array(),
});

export const zGroupsLeaderboard = z.object({
  kind: z.literal("groups"),
  label: z.string(),
  data: z
    .object({
      group: zGroupDetailBundle,
      flavorText: z.string(),
    })
    .array(),
});

export type UsersLeaderboard = z.infer<typeof zUsersLeaderboard>;
export type PostsLeaderboard = z.infer<typeof zPostsLeaderboard>;
export type GroupsLeaderboard = z.infer<typeof zGroupsLeaderboard>;

export const zLeaderboard = z.discriminatedUnion("kind", [
  zUsersLeaderboard,
  zPostsLeaderboard,
  zGroupsLeaderboard,
]);
export type Leaderboard = z.infer<typeof zLeaderboard>;

export const zLeaderboardsRequest = z.object({
  window: zLeaderboardWindow.optional(),
});

export const zLeaderboardsResponse = z.object({
  leaderboards: zLeaderboard.array(),
});

export type LeaderboardsResponse = z.infer<typeof zLeaderboardsResponse>;

export interface WorldLeaderboard {
  label: string;
  category: LeaderboardCategory;
  order?: LeaderboardOrder;
  flavor: (count: number) => string;
}

const staticWorldLeaderboardDefs: WorldLeaderboard[] = [
  {
    label: "Paparazzi",
    category: `fh:postPhoto`,
    flavor: (count) => `${count} ${pluralize("photo", count)}`,
  },
  {
    label: "Influencer",
    category: `fh:receiveLike`,
    flavor: (count) => `${count} ${pluralize("like", count)}`,
  },
  {
    label: "Elite Fishmonger",
    category: "ecs:fished:fish",
    flavor: (count) => `${count} ${pluralize("fish", count)}`,
  },
  {
    label: "Elite Farmer",
    category: `fh:growSeed`,
    flavor: (count) => `${count} ${pluralize("crop", count)}`,
  },
  {
    label: "Biggest Catch",
    category: `ecs:fished:maxLength`,
    flavor: (count) => `${prettyFishLength(count)}`,
  },
  {
    label: "Most Recipes Crafted",
    category: `ecs:craft`,
    flavor: (count) => `${count} ${pluralize("craft", count)}`,
  },
  {
    label: "Most Quests Completed",
    category: "ecs:challengeCompleted",
    flavor: (count) => `${count} ${pluralize("quest", count)}`,
  },
  {
    label: "Most Blocks Placed",
    category: `ecs:place:block`,
    flavor: (count) => `${count} ${pluralize("block", count)}`,
  },
  {
    label: "Warp Master",
    category: `fh:warp`,
    flavor: (count) => `${count} ${pluralize("warp", count)}`,
  },
  {
    label: "Most Gossipy",
    category: `fh:dm`,
    flavor: (count) => `${count} ${pluralize("DM", count)}`,
  },
  {
    label: "Most Tagged",
    category: `fh:inPhoto`,
    flavor: (count) => `${count} ${pluralize("photo", count)}`,
  },
  {
    label: "Most Positive",
    category: `fh:like`,
    flavor: (count) => `${count} ${pluralize("like", count)}`,
  },
  {
    label: "Most Clothed",
    category: `ecs:craft:wearable`,
    flavor: (count) => `${count} ${pluralize("item", count)}`,
  },
  {
    label: "Most Deadly",
    category: `ecs:npcKilled`,
    flavor: (count) => `${count} ${pluralize("mucker", count)} slain`,
  },
  {
    label: "Most Played",
    category: "playTime",
    flavor: (ms) => {
      const hours = Math.floor(ms / 1000 / 60 / 60);
      return `${hours} ${pluralize("hour", hours)} played`;
    },
  },
];

const worldLeaderboardDefs = bikkieDerived("worldLeaderboardDefs", () => {
  const metaquests = getBiscuits("/metaquests");
  const metaquestLeaderboards = metaquests.map(
    (mq) =>
      <WorldLeaderboard>{
        label: mq.displayName,
        category: `metagame:${mq.id}:points`,
        flavor: (count) => `${count} ${pluralize("point", count)}`,
      }
  );
  return [...metaquestLeaderboards, ...staticWorldLeaderboardDefs];
});

async function computeLeaderboardFor(
  { db, worldApi }: WebServerContext,
  userId: BiomesId | undefined,
  timeWindow: LeaderboardWindow
) {
  const leaderboard = worldApi.leaderboard();

  const [topUsers, topPosts, topGroupsItems, ...worldLeaderboards] =
    await Promise.all([
      mostFollowed(db, "desc", 0, 4),
      topFeedPosts(db, 4),
      topEnvironmentGroups(db, 4),
      ...worldLeaderboardDefs().map((lb) =>
        leaderboard.get(lb.category, timeWindow, lb.order ?? "DESC", 3)
      ),
    ]);

  const userIdsToFetch = new Set<BiomesId>();
  for (const lb of worldLeaderboards) {
    for (const { id } of lb) {
      userIdsToFetch.add(id);
    }
  }
  const [topUserBundles, topPostBundles, topGroupBundles, otherUserBundles] =
    await Promise.all([
      fetchUserBundles(db, ...topUsers),
      fetchFeedPostBundles(db, worldApi, userId, ...topPosts),
      fetchGroupDetailBundlesByIds(
        db,
        worldApi,
        topGroupsItems.map((e) => e.id),
        {
          queryingUserId: userId,
        }
      ),
      fetchUserBundlesByIds(db, ...userIdsToFetch),
    ]);

  const bundlesById = new Map<BiomesId, UserBundle | undefined>(
    mapSet(userIdsToFetch, (id, idx) => [id, otherUserBundles[idx]])
  );

  const leaderboards: Leaderboard[] = [];
  const defs = worldLeaderboardDefs();

  for (let i = 0; i < defs.length; ++i) {
    const def = defs[i];
    const lb = worldLeaderboards[i];
    if (lb.length === 0) {
      continue;
    }

    const data = [];
    for (const { value, id } of lb) {
      const user = bundlesById.get(id);
      if (!user) {
        // TODO: Handle missing users.
        continue;
      }
      data.push({ user, flavorText: def.flavor(value) });
    }
    leaderboards.push(<UsersLeaderboard>{
      kind: "users",
      label: def.label,
      data,
    });
  }

  if (timeWindow === "alltime") {
    leaderboards.push({
      kind: "users",
      label: "Most Followed",
      data: topUserBundles.map((e) => ({
        user: e,
        flavorText: `${e.numFollowers} ${pluralize(
          "follower",
          e.numFollowers
        )}`,
      })),
    });
  }

  if (timeWindow === "thisWeek") {
    leaderboards.push(<PostsLeaderboard>{
      kind: "posts",
      label: "Most Liked Photos This Week",
      data: compact(topPostBundles).map((e) => ({
        post: e,
        flavorText: `${e.numLikes} ${pluralize("like", e.numLikes)}`,
      })),
    });
    leaderboards.push(<GroupsLeaderboard>{
      kind: "groups",
      label: "Most Liked Builds This Week",
      data: topGroupBundles.map((e) => ({
        group: e,
        flavorText: `${e.numLikes} ${pluralize("like", e.numLikes)}`,
      })),
    });
  }

  return {
    leaderboards,
  };
}

export async function fetchLeaderboardFor(
  context: WebServerContext,
  userId: BiomesId | undefined,
  timeWindow: LeaderboardWindow
) {
  if (!userId) {
    return context.serverCache.getOrCompute(
      30_000,
      "leaderboard",
      timeWindow,
      () => computeLeaderboardFor(context, undefined, timeWindow)
    );
  }
  return computeLeaderboardFor(context, userId, timeWindow);
}

export default biomesApiHandler(
  {
    auth: "optional",
    query: zLeaderboardsRequest,
    response: zLeaderboardsResponse,
  },
  async ({ context, auth, query: { window: timeWindow } }) => {
    return fetchLeaderboardFor(context, auth?.userId, timeWindow ?? "alltime");
  }
);
