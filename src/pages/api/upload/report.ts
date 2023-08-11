import { writeCvalsToBigQuery } from "@/pages/api/cval_logging";
import type { Attachment } from "@/server/shared/linear";
import { createIssue, uploadForInlineImage } from "@/server/shared/linear";
import type { BDB } from "@/server/shared/storage";
import { feedPostById } from "@/server/web/db/social";
import { findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { postUserReportToDiscord } from "@/server/web/util/discord";
import { absoluteWebServerURL } from "@/server/web/util/urls";
import {
  reportReasonDescription,
  zReportReasons,
} from "@/shared/asset_defs/reports";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import { makeJsonSafe } from "@/shared/json";
import { log } from "@/shared/logging";
import type { Vec3 } from "@/shared/math/types";
import { zJSONObject } from "@/shared/util/type_helpers";
import { adminUserUrl } from "@/shared/util/urls";
import { ok } from "assert";
import { capitalize, isObject } from "lodash";
import { render } from "prettyjson";
import { z } from "zod";

export const zReportProfileTarget = z.object({
  kind: z.literal("profile"),
  targetId: zBiomesId,
});

export const zReportPostTarget = z.object({
  kind: z.literal("post"),
  targetId: zBiomesId,
});

export const zReportGroupTarget = z.object({
  kind: z.literal("group"),
  targetId: zBiomesId,
});

export const zReportBugTarget = z.object({
  kind: z.literal("bug"),
});

export const zReportFeedbackTarget = z.object({
  kind: z.literal("feedback"),
});

export const zWakeupReportTarget = z.object({
  kind: z.literal("wakeUp"),
});

export const zReportTarget = z.discriminatedUnion("kind", [
  zReportProfileTarget,
  zReportPostTarget,
  zReportGroupTarget,
  zReportBugTarget,
  zReportFeedbackTarget,
  zWakeupReportTarget,
]);

export type ReportFlowTarget = z.infer<typeof zReportTarget>;

export const zReportRequest = z.object({
  target: zReportTarget,
  reason: zReportReasons,
  otherReason: z.string().optional(),
  clientCvals: zJSONObject.optional(),
  buildId: z.string().optional(),
  buildTimestamp: z.number().optional(),
  screenshotDataURI: z.string().optional(),
});

export type ReportRequest = z.infer<typeof zReportRequest>;

async function targetInfo(db: BDB, target: ReportFlowTarget): Promise<string> {
  switch (target.kind) {
    case "feedback":
    case "bug":
    case "wakeUp":
      return "";
    case "profile":
      const targetUser = await findByUID(db, target.targetId);
      return `\
Target:[${targetUser?.username}](${absoluteWebServerURL(
        adminUserUrl(target.targetId)
      )}) (${target.targetId})
`;
    case "post":
      const targetPost = await feedPostById(db, target.targetId);
      return `\
Target ID: ${target.targetId}
Target Author: [${targetPost?.userId}](${absoluteWebServerURL(
        adminUserUrl(targetPost?.userId ?? INVALID_BIOMES_ID)
      )})
Target Caption: ${targetPost?.media?.map((m) => m.caption ?? "").join(", ")}
`;

    case "group":
      return `\
Target ID: ${target.targetId}
`;
  }
}

function reportTitle(reportData: ReportRequest): string {
  if (reportData.otherReason) {
    return `Report: ${reportData.otherReason}`;
  }
  return reportReasonDescription(reportData.reason);
}

function positionToLink(x: number, y?: number, z?: number): string {
  return `https://www.biomes.gg/at/${x}/${y}/${z}`;
}

function safeCvalPositionGet(cvals: any, path: string[]): Vec3 | undefined {
  if (!isObject(cvals)) {
    return;
  }
  ok(path.length > 0);
  if (path.length > 1) {
    return safeCvalPositionGet(
      (cvals as Record<string, any>)[path[0]],
      path.slice(1)
    );
  }
  const value = (cvals as Record<string, any>)[path[0]];
  if (!isObject(value)) {
    return;
  }
  const pos = value as Record<string, any>;
  if (
    typeof pos.x !== "number" ||
    typeof pos.y !== "number" ||
    typeof pos.z !== "number"
  ) {
    return;
  }
  return [pos.x, pos.y, pos.z];
}

export default biomesApiHandler(
  {
    auth: "required",
    body: zReportRequest,
  },
  async ({
    context: { db, worldApi, bigQuery },
    auth: { userId },
    body: reportData,
  }) => {
    const user = await findByUID(db, userId);
    okOrAPIError(user, "not_found");

    const [targetInfoString, [version, entity]] = await Promise.all([
      targetInfo(db, reportData.target),
      worldApi.getWithVersion(user.id),
    ]);
    const clientPos = safeCvalPositionGet(reportData.clientCvals, [
      "localPlayer",
      "position",
    ]);

    const attachments: Attachment[] = [
      {
        title: "Client Cvals",
        filename: "client_cvals.json",
        mimeType: "application/json",
        data: new TextEncoder().encode(
          render(reportData.clientCvals, { noColor: true })
        ),
      },
      {
        title: "ECS State",
        filename: "ecs.json",
        mimeType: "application/json",
        data: new TextEncoder().encode(
          render(makeJsonSafe(entity?.materialize()), { noColor: true })
        ),
      },
    ];

    let screenshotURL: string | undefined;
    if (reportData.screenshotDataURI) {
      screenshotURL = await uploadForInlineImage(reportData.screenshotDataURI);
    }

    let id: string | undefined;
    try {
      id = await createIssue({
        title: reportTitle(reportData),
        labels: ["Reported", `Report-${capitalize(reportData.target.kind)}`],
        description: `\
Target Kind: ${reportData.target.kind}
${targetInfoString}

Reason: ${reportData.reason}
Other reason:
${reportData.otherReason || "None"}

${screenshotURL ? `![Screenshot](${screenshotURL})` : ""}

Reporter: [${user.username}](${absoluteWebServerURL(adminUserUrl(user.id))}) (${
          user.id
        })
Where (client): ${
          clientPos
            ? `[${clientPos.join(",")}](${positionToLink(...clientPos)})`
            : "unknown"
        }
ECS Version: ${version}
Build ID: ${reportData.buildId ?? "unknown"}
Build Timestamp: ${reportData.buildTimestamp ?? "unknown"}
Build Age: ${
          reportData.buildTimestamp
            ? (Date.now() - reportData.buildTimestamp) / 1000
            : "unknown"
        }`,
        attachments,
      });
    } catch (error: any) {
      log.error("Failed to create linear issue for user report", { error });
    }

    try {
      await postUserReportToDiscord(
        user,
        id,
        reportTitle(reportData),
        screenshotURL
      );
    } catch (error: any) {
      log.error("Failed to create user report for discord", { error });
    }

    // Also log cvals to our database so they can be queried later.
    if (reportData.clientCvals) {
      writeCvalsToBigQuery(
        bigQuery,
        userId,
        reportData.clientCvals,
        reportData.target.kind === "wakeUp" ? "wakeUp" : "report"
      );
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
