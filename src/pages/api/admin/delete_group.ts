import { GameEvent } from "@/server/shared/api/game_event";
import { findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { UnGroupEvent } from "@/shared/ecs/gen/events";
import { toStoredEntityId, zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zDeleteGroupRequest = z.object({
  userId: zBiomesId,
  groupId: zBiomesId,
});

export type DeleteGroupRequest = z.infer<typeof zDeleteGroupRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zDeleteGroupRequest,
  },
  async ({ context: { db, logicApi }, body: { userId, groupId } }) => {
    const user = await findByUID(db, userId);
    okOrAPIError(user, "not_found");

    await logicApi.publish(
      new GameEvent(
        userId,
        new UnGroupEvent({ id: groupId, user_id: userId, remove_voxels: true })
      )
    );

    await db
      .collection("environment-groups")
      .doc(toStoredEntityId(groupId))
      .delete();
  }
);
