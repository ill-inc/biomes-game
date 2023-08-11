import { addWebPushToken } from "@/server/web/db/push";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zRegisterPushRequest = z.object({
  token: z.string(),
});

export type RegisterPushRequest = z.infer<typeof zRegisterPushRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zRegisterPushRequest,
  },
  async ({ context: { db }, auth: { userId }, body: { token } }) => {
    await addWebPushToken(db, userId, token);
  }
);
