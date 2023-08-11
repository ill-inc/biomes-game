import { writeCvalsToBigQuery } from "@/pages/api/cval_logging";
import { uploadForInlineImage } from "@/server/shared/linear";
import { findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { postWakeUpScreenshotToDiscord } from "@/server/web/util/discord";
import { zJSONObject } from "@/shared/util/type_helpers";
import { z } from "zod";

export const zWakeUpScreenshotRequest = z.object({
  clientCvals: zJSONObject.optional(),
  buildId: z.string().optional(),
  buildTimestamp: z.number().optional(),
  screenshotDataURI: z.string().optional(),
});

export type WakeUpScreenshotRequest = z.infer<typeof zWakeUpScreenshotRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zWakeUpScreenshotRequest,
  },
  async ({ context: { db, bigQuery }, auth: { userId }, body: reportData }) => {
    const user = await findByUID(db, userId);
    okOrAPIError(user, "not_found");

    let screenshotURL: string | undefined;
    if (reportData.screenshotDataURI) {
      screenshotURL = await uploadForInlineImage(reportData.screenshotDataURI);

      await postWakeUpScreenshotToDiscord(user, screenshotURL);
    }

    // Also log cvals to our database so they can be queried later.
    if (reportData.clientCvals) {
      writeCvalsToBigQuery(bigQuery, userId, reportData.clientCvals, "wakeUp");
    }
  }
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "32mb",
    },
  },
};
