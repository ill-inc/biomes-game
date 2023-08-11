import { clearCallbackFailedCookie } from "@/server/shared/auth/cookies";
import {
  startForeignAuth,
  validateProvider,
} from "@/server/shared/auth/foreign";
import {
  DoNotSendResponse,
  biomesApiHandler,
  zDoNotSendResponse,
} from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zLinkRequest = z.object({
  provider: z.string(),
});

export default biomesApiHandler(
  {
    auth: "required",
    query: zLinkRequest,
    response: zDoNotSendResponse,
  },
  async ({
    context: { db },
    query: { provider: rawProvider },
    unsafeRequest,
    unsafeResponse,
  }) => {
    const provider = validateProvider(rawProvider);
    clearCallbackFailedCookie(unsafeResponse);
    await startForeignAuth(db, provider, unsafeRequest, unsafeResponse, true);
    return DoNotSendResponse;
  }
);
