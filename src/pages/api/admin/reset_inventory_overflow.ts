import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { Inventory } from "@/shared/ecs/gen/components";
import { zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { z } from "zod";

export const zResetInventoryOverflowRequest = z.object({
  userId: zBiomesId,
});
export type ResetInventoryOverflowRequest = z.infer<
  typeof zResetInventoryOverflowRequest
>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zResetInventoryOverflowRequest,
  },
  async ({
    context: { worldApi },
    body: { userId: targetId },
    auth: { userId: adminId },
  }) => {
    const [version, entity] = await worldApi.getWithVersion(targetId);
    okOrAPIError(entity, "not_found");
    const player = entity.edit();
    player.mutableInventory().overflow.clear();
    const delta = player.finish();
    okOrAPIError(delta, "not_found");
    log.warn(
      `Admin ${adminId} resetting Inventory Overflow of player ${targetId}`
    );

    await worldApi.apply({
      iffs: [[entity.id, version, Inventory.ID]],
      changes: [
        {
          kind: "update",
          entity: delta,
        },
      ],
    });
  }
);
