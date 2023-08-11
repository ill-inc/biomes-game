import {
  categoryForRequestLeaderboard,
  zRequestLeaderboard,
} from "@/pages/api/social/leaderboard_nearby_values";
import type { WorldApi } from "@/server/shared/world/api";
import {
  zLeaderboardOrder,
  zLeaderboardPosition,
  zLeaderboardWindow,
} from "@/server/shared/world/api";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zLeaderboardGetAfterQuery = z.object({
  window: zLeaderboardWindow,
  order: zLeaderboardOrder.default("DESC"),
  score: z.number().optional(),
  count: z.number().min(0).max(50),
  leaderboard: zRequestLeaderboard,
});

export type LeaderboardGetAfterQuery = z.infer<
  typeof zLeaderboardGetAfterQuery
>;

export const zLeaderboardGetAfterRequest = zLeaderboardGetAfterQuery.array();

export type LeaderboardGetAfterRequest = z.infer<
  typeof zLeaderboardGetAfterRequest
>;

export const zLeaderboardGetAfterResponse = zLeaderboardPosition
  .array()
  .array();

export type LeaderboardGetAfterResponse = z.infer<
  typeof zLeaderboardGetAfterResponse
>;

// TODO: move to pipeline
async function doFetch(worldApi: WorldApi, query: LeaderboardGetAfterQuery) {
  if (query.score === undefined) {
    const values = await worldApi
      .leaderboard()
      .get(
        categoryForRequestLeaderboard(query.leaderboard),
        query.window,
        query.order,
        query.count
      );

    return values;
  } else {
    const values = await worldApi
      .leaderboard()
      .getAfterScore(
        categoryForRequestLeaderboard(query.leaderboard),
        query.window,
        query.order,
        query.score,
        query.count
      );

    return values;
  }
}

export default biomesApiHandler(
  {
    auth: "optional",
    body: zLeaderboardGetAfterRequest,
    response: zLeaderboardGetAfterResponse,
  },
  async ({ context: { worldApi }, body }) => {
    return Promise.all(body.map((e) => doFetch(worldApi, e)));
  }
);
