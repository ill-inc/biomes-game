import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { stringToItemBag } from "@/shared/game/items_serde";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zActAsIfCollectedRequest = z.object({
  userId: zBiomesId,
  serializedBag: z.string(),
});

export type ActAsIfCollectedRequest = z.infer<typeof zActAsIfCollectedRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zActAsIfCollectedRequest,
  },
  async ({ context: { firehose }, body: { userId, serializedBag } }) => {
    stringToItemBag(serializedBag);
    await firehose.publish({
      kind: "collect",
      entityId: userId,
      mined: true,
      bag: serializedBag,
    });
  }
);
