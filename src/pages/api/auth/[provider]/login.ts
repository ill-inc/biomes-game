import { clearCallbackFailedCookie } from "@/server/shared/auth/cookies";
import {
  startForeignAuth,
  validateProvider,
} from "@/server/shared/auth/foreign";
import { validateInviteCode } from "@/server/web/db/invite_codes";
import { okOrAPIError } from "@/server/web/errors";
import {
  DoNotSendResponse,
  biomesApiHandler,
  zDoNotSendResponse,
} from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zLoginRequest = z.object({
  inviteCode: z.string().default(""),
  provider: z.string(),
});

export default biomesApiHandler(
  {
    auth: "optional",
    query: zLoginRequest,
    response: zDoNotSendResponse,
  },
  async ({
    context: { db },
    query: { inviteCode, provider: rawProvider },
    unsafeRequest,
    unsafeResponse,
  }) => {
    if (inviteCode) {
      okOrAPIError(
        await validateInviteCode(db, inviteCode),
        "unauthorized",
        "Invalid invite code"
      );
    }
    const provider = validateProvider(rawProvider);
    clearCallbackFailedCookie(unsafeResponse);
    await startForeignAuth(db, provider, unsafeRequest, unsafeResponse, false);
    return DoNotSendResponse;
  }
);
