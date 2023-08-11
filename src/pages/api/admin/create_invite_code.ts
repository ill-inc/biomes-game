import {
  createInviteCode,
  genInviteCodeString,
} from "@/server/web/db/invite_codes";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zCreateInviteCodeRequest = z.object({
  codePrefix: z.string().optional(),
  createMemo: z.string().optional(),
  maxUses: z.number(),
});

export type CreateInviteCodeRequest = z.infer<typeof zCreateInviteCodeRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zCreateInviteCodeRequest,
  },
  async ({
    context: { db },
    body: { codePrefix, createMemo, maxUses },
    auth: { userId },
  }) => {
    await createInviteCode(
      db,
      genInviteCodeString(codePrefix),
      maxUses,
      userId,
      createMemo
    );
  }
);
