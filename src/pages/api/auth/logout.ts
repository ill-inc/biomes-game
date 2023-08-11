import {
  clearAuthCookies,
  clearCallbackFailedCookie,
} from "@/server/shared/auth/cookies";
import { biomesApiHandler } from "@/server/web/util/api_middleware";

export default biomesApiHandler(
  {
    auth: "optional",
  },
  async ({ context: { sessionStore }, auth, unsafeResponse }) => {
    if (auth?.sessionId) {
      await sessionStore.destroySession(auth.sessionId);
    }
    clearCallbackFailedCookie(unsafeResponse);
    clearAuthCookies(unsafeResponse);
  }
);
