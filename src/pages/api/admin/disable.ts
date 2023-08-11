import { disableUser } from "@/server/web/db/users";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zDisableRequest = z.object({
  userId: zBiomesId,
  isDisable: z.boolean(),
});

export type DisableRequest = z.infer<typeof zDisableRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zDisableRequest,
  },
  async ({
    context: { db, sessionStore },
    body: { userId, isDisable: disabled },
  }) => {
    await disableUser(db, userId, disabled);
    await sessionStore.destroyAllSessions(userId);
  }
);
