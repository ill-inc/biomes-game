import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { createDefaultTrigger } from "@/shared/triggers/default";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zrpcWebSerialize } from "@/shared/zrpc/serde";
import { z } from "zod";

export const zNewTriggerRequest = z.object({
  kinds: z.string().array().optional(),
});

export type NewTriggerRequest = z.infer<typeof zNewTriggerRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zNewTriggerRequest,
    response: z.string(),
  },
  async ({ context: { idGenerator }, body: { kinds } }) => {
    return zrpcWebSerialize(
      await createDefaultTrigger(
        idGenerator,
        (kinds === undefined
          ? "event"
          : kinds[0]) as StoredTriggerDefinition["kind"]
      )
    );
  }
);
