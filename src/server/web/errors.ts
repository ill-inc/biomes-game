import type { AuthedToken } from "@/server/shared/auth/cookies";
import type {
  WebServerApiRequest,
  WebServerContext,
} from "@/server/web/context";
import type { MaybeAuthedAPIRequest } from "@/server/web/util/api_middleware";
import type { APIErrorCode } from "@/shared/api/errors";
import { APIError } from "@/shared/api/errors";
import { log } from "@/shared/logging";
import { evaluateRole } from "@/shared/roles";
import { messageFromError } from "@/shared/util/helpers";
import type { ServerResponse } from "http";
import type { NextApiResponse } from "next";
import { serializeError } from "serialize-error";

export type ServerResponseMaybeBiomesError = ServerResponse & {
  maybeBiomesError?: any;
};

export function isApiError(error: unknown): error is APIError {
  if (!error || typeof error !== "object") {
    return false;
  }
  // Due to dynamic import order, APIErrors don't always return true for above.
  // Check on the constructor name string as well
  return error instanceof APIError || error.constructor.name === "APIError";
}

async function shouldSeeFullErrorDetails(
  context?: WebServerContext,
  authedToken?: AuthedToken
) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  if (!authedToken || !context) {
    return false;
  }
  try {
    const userEntity = await context.worldApi.get(authedToken.userId);
    return evaluateRole(userEntity?.userRoles()?.roles, "admin");
  } catch (error) {
    log.warn("Could not determine if user is admin for error report", {
      error,
    });
    return false;
  }
}

export async function adjustResponseForError(
  context: WebServerContext | undefined,
  authedToken: AuthedToken | undefined,
  response: ServerResponse,
  error: any
) {
  (response as ServerResponseMaybeBiomesError).maybeBiomesError = error;
  if (isApiError(error)) {
    response.statusCode = error.status();
    response.end(JSON.stringify(error.serialize()));
    return;
  }
  response.statusCode = 500;
  response.end(
    JSON.stringify(
      (await shouldSeeFullErrorDetails(context, authedToken))
        ? { error: "internal_server_error", ...serializeError(error) }
        : { error: "internal_server_error", message: "" }
    )
  );
}

export function nextErrorMiddleware<
  RT extends MaybeAuthedAPIRequest<WebServerApiRequest>,
  RS extends NextApiResponse = NextApiResponse
>(handler: (req: RT, res: RS) => Promise<void>) {
  return async (req: RT, res: RS) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      await adjustResponseForError(req.context, req.authedToken, res, error);
    }
  };
}

export function okOrAPIError(
  value: unknown,
  errorCode: APIErrorCode = "not_found",
  description?: string
): asserts value {
  if (!value) {
    throw new APIError(errorCode, description);
  }
}

export function validateString(item: any): string {
  if (typeof item !== "string") {
    throw new APIError("bad_param");
  }
  return item;
}

export function apiErrorBoundary<T>(code: APIErrorCode, fn: () => T): T {
  try {
    return fn();
  } catch (error: any) {
    throw new APIError(code, messageFromError(error));
  }
}
