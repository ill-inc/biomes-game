import type { AuthedToken } from "@/server/shared/auth/cookies";
import { verifyAuthenticatedRequest } from "@/server/shared/auth/cookies";
import type { WebServerApiRequest } from "@/server/web/context";
import { nextErrorMiddleware, okOrAPIError } from "@/server/web/errors";
import type {
  InferInput,
  TypedEndpointConfig,
  TypedRequest,
} from "@/server/web/util/typing";
import { parseOrApiError } from "@/server/web/util/typing";
import { APIError } from "@/shared/api/errors";
import { safeParseBiomesId, zBiomesId } from "@/shared/ids";
import { addToLogContext, log, withLogContext } from "@/shared/logging";
import { evaluateRole } from "@/shared/roles";
import { isBinaryData } from "@/shared/util/binary";
import { zrpcWebDeserialize, zrpcWebSerialize } from "@/shared/zrpc/serde";
import { isObject } from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";
import { render } from "prettyjson";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

// Do not use, use biomesAPIHandler
function logContextMiddleware<
  RT extends WebServerApiRequest = WebServerApiRequest,
  RS extends NextApiResponse = NextApiResponse
>(handler: (req: RT, res: RS) => Promise<void>) {
  return async (req: RT, res: RS) => {
    let path = "[unknown]";
    if (req.url) {
      const baseURL = "http://" + (req.headers.host ?? "");
      const url = new URL(req.url, baseURL);
      path = url.pathname;
    }
    await withLogContext({ path }, async () => {
      await handler(req, res);
    });
  };
}

export type AuthedAPIRequest<T extends NextApiRequest = NextApiRequest> = T & {
  authedToken: AuthedToken;
};

export type MaybeAuthedAPIRequest<T extends NextApiRequest = NextApiRequest> =
  T & {
    authedToken?: AuthedToken;
  };

// Do not use, use biomesAPIHandler
function authOptionalAPIMiddleware<
  RT extends WebServerApiRequest = WebServerApiRequest,
  RS extends NextApiResponse = NextApiResponse
>(
  handler: (req: MaybeAuthedAPIRequest<RT>, res: RS) => Promise<void>
): (req: RT, res: RS) => Promise<void> {
  return async (req: RT, res: RS) => {
    const token = await verifyAuthenticatedRequest(
      req.context.sessionStore,
      req,
      res
    );
    const augmentedRequest = req as AuthedAPIRequest<RT>;
    if (!token.error) {
      augmentedRequest.authedToken = token.auth;
      addToLogContext({
        sessionId: token.auth.sessionId,
        userId: token.auth.userId,
      });
    }
    await handler(augmentedRequest, res);
  };
}

export type ApiEndpointConfig<
  TZodBody extends ZodTypeAny,
  TZodQuery extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
> = TypedEndpointConfig<TZodQuery> & {
  body?: TZodBody;
  response?: TZodResponse;
  method?: "GET" | "POST";
  cors?: "allow";
  zrpc?: boolean;
};

export type AnyApiEndpointConfig = ApiEndpointConfig<
  ZodTypeAny,
  ZodTypeAny,
  ZodTypeAny
>;

export class DoNotSendResponseMarker {}

export const zDoNotSendResponse = z.instanceof(DoNotSendResponseMarker);
export const DoNotSendResponse = new DoNotSendResponseMarker();

export type InferOutput<T> = T extends ZodTypeAny ? z.infer<T> : void;

export type ApiRequest<TConfig extends AnyApiEndpointConfig> =
  TypedRequest<TConfig> & {
    body: InferInput<TConfig["body"]>;
    unsafeRequest: WebServerApiRequest;
    unsafeResponse: NextApiResponse;
  };

function extractNumber(a: unknown) {
  if (a === undefined) {
    return undefined;
  }
  if (a === "") {
    return undefined;
  }

  return parseInt(String(a), 10);
}

function extractNumbers(a: unknown) {
  if (a === undefined) {
    return [];
  }

  if (a === "") {
    return [];
  }

  return String(a)
    .split(",")
    .map((e) => parseInt(e, 10));
}

export const zQueryBoolean = z.preprocess((a) => {
  if (a === undefined) {
    return undefined;
  }
  if (a === "") {
    return undefined;
  }

  return a === "true" || a === "1";
}, z.boolean().optional());

export const zQueryNumber = z.preprocess(extractNumber, z.number().optional());
export const zQueryNumbers = z.preprocess(extractNumbers, z.number().array());
export const zQueryBiomesId = z.preprocess(safeParseBiomesId, zBiomesId);
export const zQueryOptionalBiomesId = z.preprocess(
  safeParseBiomesId,
  zBiomesId.optional()
);
export const zQueryBiomesIds = z.preprocess(extractNumbers, zBiomesId.array());

function addCorsHeaders(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

export function biomesApiHandler<TConfig extends AnyApiEndpointConfig>(
  config: TConfig,
  handler: (
    req: ApiRequest<TConfig>
  ) => Promise<InferOutput<TConfig["response"]>>
) {
  return logContextMiddleware(
    authOptionalAPIMiddleware(
      nextErrorMiddleware(
        async (
          req: MaybeAuthedAPIRequest<WebServerApiRequest>,
          res: NextApiResponse
        ) => {
          // Check biomes auth is as required.
          if (
            process.env.OPEN_ADMIN_ACCESS !== "1" &&
            config.auth !== "optional" &&
            config.auth !== "developer_api"
          ) {
            okOrAPIError(req.authedToken, "unauthorized", "Not logged in");
            if (config.auth === "admin") {
              const userEntity = await req.context.worldApi.get(
                req.authedToken.userId
              );
              if (!evaluateRole(userEntity?.userRoles()?.roles, "admin")) {
                log.warn("Unauthorized attempt at admin endpoint", {
                  userId: req.authedToken.userId,
                });
                throw new APIError("unauthorized");
              }
            }
          }

          if (config.auth === "developer_api") {
            // TODO: check for API key here
          }

          // Handle cors behaviour.
          if (config.cors === "allow") {
            addCorsHeaders(res);
            if (req.method === "OPTIONS") {
              res.status(200).end();
              return;
            }
          }
          // Check request method.
          if (config.method !== undefined) {
            okOrAPIError(req.method === config.method, "bad_method");
          } else if (config.body !== undefined) {
            okOrAPIError(req.method === "POST", "bad_method");
          }
          const body = (() => {
            if (config.body === undefined) {
              return;
            }
            if (config.zrpc) {
              okOrAPIError(typeof req.body.z === "string", "bad_param");
              return zrpcWebDeserialize(req.body.z, config.body);
            }
            return parseOrApiError(config.body, req.body);
          })();

          // Run the actual handler.
          const response = (await handler({
            config,
            context: req.context,
            auth: req.authedToken as ApiRequest<TConfig>["auth"],
            body,
            query:
              config.query !== undefined
                ? parseOrApiError(config.query, req.query)
                : undefined,
            unsafeRequest: req,
            unsafeResponse: res,
          })) as any;
          if (config.response === undefined) {
            okOrAPIError(response === undefined, "internal_error");
            res.status(200).json({});
            return;
          }

          if (
            config.response === zDoNotSendResponse &&
            response === undefined
          ) {
            // Special case we accept undefined responses for do-not-send.
            return;
          }
          const parseResponse = config.response.safeParse(response);
          if (!parseResponse.success) {
            log.error("Error validating response schema", {
              zodError: parseResponse.error.toString(),
              value: render(response),
            });
          }
          okOrAPIError(parseResponse.success, "internal_error");
          if (
            isObject(response) &&
            response instanceof DoNotSendResponseMarker
          ) {
            return;
          } else if (isBinaryData(response)) {
            res.status(200).send(response);
          } else if (config.zrpc) {
            res.status(200).json({
              z: zrpcWebSerialize(response),
            });
          } else {
            res.status(200).json(response);
          }
        }
      )
    )
  );
}
