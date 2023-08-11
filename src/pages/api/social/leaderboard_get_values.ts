import {
  categoryForRequestLeaderboard,
  zRequestLeaderboard,
} from "@/pages/api/social/leaderboard_nearby_values";
import {
  zLeaderboardOrder,
  zLeaderboardPosition,
  zLeaderboardWindow,
} from "@/server/shared/world/api";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zLeaderboardRequestValueQuery = z.object({
  window: zLeaderboardWindow,
  leaderboard: zRequestLeaderboard,
  order: zLeaderboardOrder.default("DESC"),
  id: zBiomesId,
});

export type LeaderboradRequestValueQuery = z.infer<
  typeof zLeaderboardRequestValueQuery
>;

export const zLeaderboardGetValuesRequest =
  zLeaderboardRequestValueQuery.array();
export type LeaderboardGetValuesRequest = z.infer<
  typeof zLeaderboardGetValuesRequest
>;

export const zLeaderboardGetValuesResponse = z
  .union([zLeaderboardPosition, z.null()])
  .array();

export type LeaderboardGetValuesResponse = z.infer<
  typeof zLeaderboardGetValuesResponse
>;

export default biomesApiHandler(
  {
    auth: "optional",
    body: zLeaderboardGetValuesRequest,
    response: zLeaderboardGetValuesResponse,
  },
  async ({ context: { worldApi }, body }) => {
    const values = await worldApi.leaderboard().getValues(
      body.map((e) => ({
        category: categoryForRequestLeaderboard(e.leaderboard),
        window: e.window,
        order: e.order,
        id: e.id,
      }))
    );
    return values.map((e) => (e ? e : null));
  }
);
