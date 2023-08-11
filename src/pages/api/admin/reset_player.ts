import { newPlayer } from "@/server/logic/utils/players";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { z } from "zod";

export const zResetPlayerRequest = z.object({
  userId: zBiomesId,
});
export type ResetPlayerRequest = z.infer<typeof zResetPlayerRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zResetPlayerRequest,
  },
  async ({
    context: { worldApi },
    body: { userId: targetId },
    auth: { userId: adminId },
  }) => {
    const entity = await worldApi.get(targetId);
    okOrAPIError(entity, "not_found");
    const name = entity.label()?.text;
    okOrAPIError(name, "not_found");
    log.warn(`Admin ${adminId} fully resetting player ${targetId}`);
    await worldApi.apply({
      changes: [
        {
          kind: "create",
          entity: newPlayer(targetId, name),
        },
      ],
    });
  }
);
