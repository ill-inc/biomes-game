import { getDeviceIdCookie } from "@/server/shared/auth/cookies";
import { captureRequest, httpRequestContext } from "@/server/web/app";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zFunnelRequest } from "@/shared/funnel";
import { log } from "@/shared/logging";

export default biomesApiHandler(
  {
    auth: "optional",
    body: zFunnelRequest,
  },
  async ({ auth, body, unsafeRequest }) => {
    const bdid = getDeviceIdCookie(unsafeRequest);
    log.info("FUNNEL-REPORT", {
      funnel: {
        userId: auth?.userId,
        requestUserId: auth?.userId,
        bdid,
        requestBdid: bdid,
        ...body,
      },
      httpRequest: httpRequestContext(captureRequest(unsafeRequest)),
    });
  }
);
