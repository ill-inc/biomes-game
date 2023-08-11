import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminGiveItemEvent } from "@/shared/ecs/gen/events";
import { stringToItemBag } from "@/shared/game/items_serde";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zGiveTargets = z.enum(["inventory", "overflow"]);

export type GiveTargets = z.infer<typeof zGiveTargets>;

export const zGiveItemRequest = z.object({
  userId: zBiomesId,
  serializedBag: z.string(),
  giveTarget: zGiveTargets,
});

export type GiveItemRequest = z.infer<typeof zGiveItemRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zGiveItemRequest,
  },
  async ({
    context: { logicApi },
    body: { userId, serializedBag, giveTarget },
  }) => {
    const bag = stringToItemBag(serializedBag);
    await logicApi.publish(
      new GameEvent(
        userId,
        new AdminGiveItemEvent({
          id: userId,
          bag,
          toOverflow: giveTarget === "overflow",
        })
      )
    );
  }
);
