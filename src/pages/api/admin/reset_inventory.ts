import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminResetInventoryEvent } from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zResetInventoryRequest = z.object({
  userId: zBiomesId,
});

export type ResetInventoryRequest = z.infer<typeof zResetInventoryRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zResetInventoryRequest,
  },
  async ({ context: { logicApi }, body: { userId } }) => {
    await logicApi.publish(
      new GameEvent(
        userId,
        new AdminResetInventoryEvent({ id: userId, user_id: userId })
      )
    );
  }
);
