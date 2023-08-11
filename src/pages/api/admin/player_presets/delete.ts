import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminDeleteEvent } from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zDeletePlayerPresetRequest = z.object({
  id: zBiomesId,
});

export type DeletePlayerPresetRequest = z.infer<
  typeof zDeletePlayerPresetRequest
>;

export const zDeletePlayerPresetResponse = z.boolean();

export type DeletePlayerPresetResponse = z.infer<
  typeof zDeletePlayerPresetResponse
>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zDeletePlayerPresetRequest,
    response: zDeletePlayerPresetResponse,
  },
  async ({ context: { logicApi }, body: { id }, auth: { userId } }) => {
    const event = new GameEvent(
      userId,
      new AdminDeleteEvent({ id: userId, entity_id: id })
    );
    await logicApi.publish(event);
    return true;
  }
);
