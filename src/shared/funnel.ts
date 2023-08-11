import { zBiomesId, type BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { removeFalsyInPlace } from "@/shared/util/object";
import { asyncBackoffOnAllErrors } from "@/shared/util/retry_helpers";
import { zJSONObject, type JSONObject } from "@/shared/util/type_helpers";
import { z } from "zod";

export type FunnelStage =
  | "landOnWebsite"
  | "playNowButton"
  | "clickedLoginLink"
  | "shownLoginFlow"
  | "inDiscord"
  | "authenticated" // Includes authentication-method.
  | "finishedLoginFlow"
  | "loadingScreen"
  | "wakeUp:initial"
  | "wakeUp:name-entry"
  | "wakeUp:character"
  | "wakeUp:waking"
  | "walkNux"
  | "talkToJackie"
  | "completeQuest" // Includes quest-ID
  | "playedTenMinutes";

export interface ReportFunnelStageInput {
  bdid?: string;
  userId?: BiomesId;
  extra?: JSONObject;
}

export const zFunnelRequest = z.object({
  stage: z.string(),
  bdid: z.string().optional(),
  userId: zBiomesId.optional(),
  extra: zJSONObject.optional(),
  nonce: z.string().optional(),
  env: z.string().optional(),
});

export type FunnelRequest = z.infer<typeof zFunnelRequest>;

async function internalReportFunnelStage(
  stage: FunnelStage,
  input?: ReportFunnelStageInput
) {
  const nonce = autoId();
  const bdid = input?.bdid;
  const userId = input?.userId;
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  await asyncBackoffOnAllErrors(
    async () =>
      jsonPost<void, FunnelRequest>(
        "https://www.biomes.gg/api/f",
        removeFalsyInPlace({
          stage,
          bdid,
          userId,
          nonce,
          extra: input?.extra,
          env:
            process.env.NODE_ENV !== "production"
              ? process.env.NODE_ENV
              : undefined,
        })
      ),
    {
      maxAttempts: 3,
      baseMs: 250,
    }
  );
}

export function reportFunnelStage(
  stage: FunnelStage,
  input?: ReportFunnelStageInput
) {
  if (process.env.IS_SERVER) {
    log.info("FUNNEL-REPORT", {
      funnel: removeFalsyInPlace({
        ...input,
        stage,
        nonce: autoId(),
        env:
          process.env.NODE_ENV !== "production"
            ? process.env.NODE_ENV
            : undefined,
      }),
    });
  } else {
    fireAndForget(internalReportFunnelStage(stage, input));
  }
}
