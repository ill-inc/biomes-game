import type { LeaderboardCategory } from "@/server/shared/world/api";
import {
  zLeaderboardOrder,
  zLeaderboardPosition,
  zLeaderboardWindow,
} from "@/server/shared/world/api";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { assertNever } from "@/shared/util/type_helpers";
import { z } from "zod";

export const zRequestLeaderboardFishedLength = z.object({
  kind: z.literal("fished_length"),
  id: zBiomesId.optional(),
});

export const zRequestLeaderboardRaceMinigameTime = z.object({
  kind: z.literal("race_minigame_time"),
  id: zBiomesId,
});

export const zRequestLeaderboardMetagame = z.object({
  kind: z.literal("metagame"),
  id: zBiomesId,
});

export const zRequestLeaderboardMetagameTeam = z.object({
  kind: z.literal("metagame:team"),
  id: zBiomesId,
});

export const zRequestLeaderboard = z.discriminatedUnion("kind", [
  zRequestLeaderboardFishedLength,
  zRequestLeaderboardRaceMinigameTime,
  zRequestLeaderboardMetagame,
  zRequestLeaderboardMetagameTeam,
]);

export type RequestLeaderboard = z.infer<typeof zRequestLeaderboard>;

export const zLeaderboardNearbyValuesRequest = z.object({
  window: zLeaderboardWindow,
  order: zLeaderboardOrder.default("DESC"),
  aboveCount: z.number().min(0).max(50),
  belowCount: z.number().min(0).max(50),
  leaderboard: zRequestLeaderboard,
});

export type LeaderboardNearbyValuesRequest = z.infer<
  typeof zLeaderboardNearbyValuesRequest
>;

export const zLeaderboardNearbyValuesResponse = z.object({
  nearby: zLeaderboardPosition.array().optional(),
});

export type LeaderboardNearbyValuesResponse = z.infer<
  typeof zLeaderboardNearbyValuesResponse
>;

export function categoryForRequestLeaderboard(
  leaderboard: RequestLeaderboard
): LeaderboardCategory {
  switch (leaderboard.kind) {
    case "fished_length":
      return leaderboard.id
        ? `ecs:fished:${leaderboard.id}:maxLength`
        : "ecs:fished:maxLength";
    case "race_minigame_time":
      return `minigame:${leaderboard.id}:simple_race:time`;
    case "metagame":
      return `metagame:${leaderboard.id}:points`;
    case "metagame:team":
      return `metagame:${leaderboard.id}:points:team`;
    default:
      assertNever(leaderboard);
      throw new Error("Bad");
  }
}

export default biomesApiHandler(
  {
    auth: "required",
    body: zLeaderboardNearbyValuesRequest,
    response: zLeaderboardNearbyValuesResponse,
  },
  async ({ context: { worldApi }, auth: { userId }, body }) => {
    const values = await worldApi
      .leaderboard()
      .getNearby(
        categoryForRequestLeaderboard(body.leaderboard),
        body.window,
        body.order,
        userId,
        body.aboveCount,
        body.belowCount
      );

    return {
      nearby: values,
    };
  }
);
