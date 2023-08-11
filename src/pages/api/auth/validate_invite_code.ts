import { validateInviteCode } from "@/server/web/db/invite_codes";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zValidateInviteCodeRequest = z.object({
  inviteCode: z.string(),
});

export type ValidateInviteCodeRequest = z.infer<
  typeof zValidateInviteCodeRequest
>;

export const zValidateInviteCodeResponse = z.object({
  isValid: z.boolean(),
});

export type ValidateInviteCodeResponse = z.infer<
  typeof zValidateInviteCodeResponse
>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: zValidateInviteCodeRequest,
    response: zValidateInviteCodeResponse,
  },
  async ({ context: { db }, query: { inviteCode } }) => {
    return {
      isValid: await validateInviteCode(db, inviteCode),
    };
  }
);
