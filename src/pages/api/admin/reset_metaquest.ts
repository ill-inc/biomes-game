import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";
import { clearLeaderboardsForKey } from "@/pages/api/minigames/reset_leaderboard";
import type { LeaderboardCategory } from "@/server/shared/world/api";

export const zResetMetaquestRequest = z.object({
  id: zBiomesId,
});

export type ResetMetaquestRequest = z.infer<typeof zResetMetaquestRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zResetMetaquestRequest,
  },
  async ({ auth: {}, context: { worldApi }, body: { id } }) => {
    const categories: LeaderboardCategory[] = [
      `metagame:${id}:points`,
      `metagame:${id}:points:team`,
    ];
    for (const category of categories) {
      await clearLeaderboardsForKey(worldApi, category);
    }
  }
);
