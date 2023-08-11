import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zLogoutRequest = z.object({
  userId: zBiomesId,
});

export type LogoutRequest = z.infer<typeof zLogoutRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zLogoutRequest,
  },
  async ({ context: { sessionStore }, body: { userId } }) =>
    sessionStore.destroyAllSessions(userId)
);
