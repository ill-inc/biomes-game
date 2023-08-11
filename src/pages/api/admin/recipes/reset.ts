import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminResetRecipeEvent } from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zResetRecipesRequest = z.object({
  userId: zBiomesId,
});

export type ResetRecipesRequest = z.infer<typeof zResetRecipesRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zResetRecipesRequest,
  },
  async ({ context: { logicApi }, body: { userId } }) => {
    await logicApi.publish(
      new GameEvent(
        userId,
        new AdminResetRecipeEvent({ id: userId, clear_all: true })
      )
    );
  }
);
