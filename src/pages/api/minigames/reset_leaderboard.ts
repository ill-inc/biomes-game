import { GameEvent } from "@/server/shared/api/game_event";
import type {
  LeaderboardCategory,
  LeaderboardWindow,
  WorldApi,
} from "@/server/shared/world/api";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { TouchMinigameStatsEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { evaluateRole } from "@/shared/roles";
import { z } from "zod";

export const zResetLeaderboardRequest = z.object({
  minigameId: zBiomesId,
  result: zBiomesId.optional(),
});

export type ResetLeaderboardRequest = z.infer<typeof zResetLeaderboardRequest>;

export async function clearLeaderboardsForKey(
  worldApi: WorldApi,
  leaderboardKey: LeaderboardCategory,
  {
    windows = ["alltime", "daily", "thisWeek"],
    result,
  }: {
    windows?: LeaderboardWindow[];
    result?: BiomesId;
  } = {}
) {
  await Promise.all(
    windows.map((window) =>
      worldApi.leaderboard().clear(leaderboardKey, window, result)
    )
  );
}

export default biomesApiHandler(
  {
    auth: "required",
    body: zResetLeaderboardRequest,
  },
  async ({
    auth: { userId },
    context: { worldApi, logicApi },
    body: { minigameId, result },
  }) => {
    const minigame = await worldApi.get(minigameId);
    okOrAPIError(minigame, "not_found", "Minigame not found");
    okOrAPIError(minigame.minigameComponent()?.metadata.kind === "simple_race");

    const creatorId = minigame?.createdBy()?.id;
    if (creatorId !== userId) {
      const user = await worldApi.get(userId);
      okOrAPIError(user, "not_found", "User not found");
      okOrAPIError(
        evaluateRole(user?.userRoles()?.roles, "admin"),
        "unauthorized",
        "Not authorized to reset this minigame"
      );
    }

    const leaderboardKey: LeaderboardCategory = `minigame:${minigameId}:simple_race:time`;
    await clearLeaderboardsForKey(worldApi, leaderboardKey, { result });
    await logicApi.publish(
      new GameEvent(
        userId,
        new TouchMinigameStatsEvent({ id: userId, minigame_id: minigame.id })
      )
    );
  }
);
