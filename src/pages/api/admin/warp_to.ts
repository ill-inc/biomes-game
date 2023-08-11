import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WarpHomeEvent } from "@/shared/ecs/gen/events";
import { zVec3f } from "@/shared/ecs/gen/types";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zWarpToRequest = z.object({
  position: zVec3f,
  entityId: zBiomesId.optional(),
});

export type WarpToRequest = z.infer<typeof zWarpToRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    method: "POST",
    body: zWarpToRequest,
  },
  async ({
    context: { logicApi },
    auth: { userId },
    body: { position, entityId },
  }) =>
    logicApi.publish(
      new GameEvent(
        userId,
        new WarpHomeEvent({ id: entityId ?? userId, position, reason: "admin" })
      )
    )
);
