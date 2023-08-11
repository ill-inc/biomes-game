import type { ClientErrorRequest } from "@/pages/api/client_error";
import { fireAndForget } from "@/shared/util/async";
import { collectAll, defaultCvalDatabase } from "@/shared/util/cvals";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { messageFromError } from "@/shared/util/helpers";
import type { JSONable, RecursiveJSONable } from "@/shared/util/type_helpers";
import { serializeError } from "serialize-error";

export type ClientErrorType =
  | "LongLoad"
  | "InVoid"
  | "Disconnected"
  | "ReactError"
  | "LoggedError"
  | "FatalError"
  | "OutOfDate"
  | "UnsupportedClient"
  | "UnsupportedWebGLError";

export function reportClientError<T = JSONable>(
  // Prepended to the error message when it is logged on the server. You should
  // keep this to a single word because without a stacktrace, GCP error
  // reporting groups stack traces by only their first 3 "tokens".
  //    https://cloud.google.com/error-reporting/docs/grouping-errors
  prefix: ClientErrorType,
  error: any,
  additionalDetails?: RecursiveJSONable<T>,
  isWarning?: boolean
) {
  if (process.env.NODE_ENV !== "production") {
    // If you're a developer, you can use the console.
    return;
  }
  fireAndForget(
    (async () => {
      const cvals = (() => {
        try {
          return collectAll(defaultCvalDatabase());
        } catch (_e) {
          // We might be running this function from a bad state, or within another
          // error log stack, so just silently ignore errors during cval collection,
          // it just means they won't be included in the report.
          return undefined;
        }
      })();

      return jsonPost<{}, ClientErrorRequest>("/api/client_error", {
        message: messageFromError(error),
        error: serializeError(error),
        details: additionalDetails,
        cvals,
        prefix: `Client${prefix}`,
        buildId: process.env.BUILD_ID,
        buildTimestamp: parseInt(process.env.BUILD_TIMESTAMP ?? "0"),
        clientTimestamp: Date.now(),
        isWarning,
      });
    })()
  );
}
