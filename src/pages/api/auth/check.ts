import {
  checkCallbackFailedCookie,
  clearAuthCookies,
} from "@/server/shared/auth/cookies";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zAuthCheckResponse = z.object({
  userId: zBiomesId.optional(),
});

export type AuthCheckResponse = z.infer<typeof zAuthCheckResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    response: zAuthCheckResponse,
  },
  async ({ auth, unsafeRequest, unsafeResponse }) => {
    if (auth?.userId) {
      return {
        userId: auth.userId,
      };
    }
    checkCallbackFailedCookie(unsafeRequest);
    clearAuthCookies(unsafeResponse);
    okOrAPIError(auth, "unauthorized");
    return {};
  }
);
