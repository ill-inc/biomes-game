import { dumpAllSyncServers } from "@/server/shared/sync";
import { okOrAPIError } from "@/server/web/errors";
import { applySourceMapToCallstack } from "@/server/web/source_maps";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { log } from "@/shared/logging";
import { omit } from "lodash";
import { z } from "zod";

export const zClientErrorRequest = z.object({
  message: z.string(),
  error: z.any(),
  details: z.any().optional(),
  cvals: z.record(z.any()).optional(),
  prefix: z.string().optional(),
  buildId: z.string().optional(),
  buildTimestamp: z.number().optional(),
  clientTimestamp: z.number().optional(),
  isWarning: z.boolean().optional(),
});

export type ClientErrorRequest = z.infer<typeof zClientErrorRequest>;

const MAX_CLIENT_ERROR_SIZE = 8096;

function formatTimestamp(timestamp?: number) {
  return timestamp
    ? `${new Date(timestamp).toLocaleString("en-US", {
        timeZone: "America/New_York",
      })} EST`
    : "unknown";
}

export default biomesApiHandler(
  {
    auth: "optional",
    body: zClientErrorRequest,
  },
  async ({
    context: { sourceMapCache, worldApi },
    body: {
      message,
      error,
      details,
      cvals,
      prefix,
      buildId,
      buildTimestamp,
      clientTimestamp,
      isWarning,
    },
    auth,
  }) => {
    okOrAPIError(
      message.length < MAX_CLIENT_ERROR_SIZE,
      "bad_param",
      "Error message or details too large"
    );

    // The default prefix is intentionally kept as one word because GCP error
    // reporting groups errors without stack traces by their first 3 tokens, so
    // we don't want to waste them on prefixes.
    //   https://cloud.google.com/error-reporting/docs/grouping-errors
    prefix ??= "ClientError";

    let maybeMessageCallstack = "";
    let errorStack = error["stack"] ?? details["stack"];
    if (errorStack) {
      // If a callstack was attached to the details, deobfuscate it using
      // source maps.
      try {
        errorStack = await applySourceMapToCallstack(
          errorStack ?? "",
          sourceMapCache
        );
        // Add the deobfuscated error callstack to the message.
        maybeMessageCallstack = `\n${errorStack}`;
      } catch (error) {
        log.warn(
          `Encountered issues while applying the source map to a client stack: ${errorStack}`
        );
      }
    }

    (isWarning ? log.warn : log.error)(
      `${prefix}: ${message}${maybeMessageCallstack}`,
      {
        clientMessage: message,
        // Ensure that error is set in such a way that we don't generate a
        // server-side callstack in this call here, confusing the output log.
        error: typeof error === "object" ? omit(error, "stack") : {},
        details,
        cvals,
        buildId,
        syncDump:
          prefix === "ClientInVoid" ? await dumpAllSyncServers() : undefined,
        buildTimestamp: buildTimestamp,
        clientTimestamp: clientTimestamp,
        builtAt: formatTimestamp(buildTimestamp),
        clientTime: formatTimestamp(clientTimestamp),
        serverPosition: await (async () => {
          if (prefix !== "ClientInVoid" || !auth) {
            return "unknown";
          }
          return (await worldApi.get(auth.userId))?.position()?.v;
        })(),
      }
    );
  }
);
