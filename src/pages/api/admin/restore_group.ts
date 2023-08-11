import { GameEvent } from "@/server/shared/api/game_event";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { Box } from "@/shared/ecs/gen/components";
import { PlaceGroupEvent } from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zRestoreGroupRequest = z.object({
  groupId: zBiomesId,
});

export type RestoreGroupRequest = z.infer<typeof zRestoreGroupRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zRestoreGroupRequest,
  },
  async ({
    context: { worldApi, logicApi },
    body: { groupId },
    auth: { userId },
  }) => {
    // GI-2581 Evaluate strongGetEntity
    const entity = await worldApi.get(groupId);
    okOrAPIError(entity, "not_found");
    const creatorId = entity.createdBy()?.id;
    okOrAPIError(creatorId, "ecs_error");
    await logicApi.publish(
      new GameEvent(
        userId,
        new PlaceGroupEvent({
          id: groupId,
          user_id: creatorId,
          box: entity.box() as Box,
        })
      )
    );
  }
);
