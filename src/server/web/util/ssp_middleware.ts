import type {
  AuthedToken,
  AuthenticationResult,
} from "@/server/shared/auth/cookies";
import { verifyCookies } from "@/server/shared/auth/cookies";
import type { WebServerRequest } from "@/server/web/context";
import { adjustResponseForError, okOrAPIError } from "@/server/web/errors";
import type {
  AnyTypedEndpointConfig,
  TypedRequest,
} from "@/server/web/util/typing";
import { parseOrApiError } from "@/server/web/util/typing";
import { APIError } from "@/shared/api/errors";
import { addToLogContext, log } from "@/shared/logging";
import { evaluateRole } from "@/shared/roles";
import { ok } from "assert";
import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import nookies from "nookies";

export function maybeTokenRedirect(
  ctx: GetServerSidePropsContext,
  token: AuthenticationResult
) {
  if (token.error) {
    const encodedPath = encodeURIComponent(ctx.req.url || "/");
    return {
      redirect: {
        permanent: false,
        destination: `/login?redirect=${encodedPath}`,
      },
    };
  }
}

export type ServerSidePropsTypedRequest<
  TConfig extends AnyTypedEndpointConfig
> = TypedRequest<TConfig> & {
  serverSidePropsContext: GetServerSidePropsContext;
};

export function biomesGetServerSideProps<
  TConfig extends AnyTypedEndpointConfig,
  Props
>(
  config: TConfig,
  handler: (
    req: ServerSidePropsTypedRequest<TConfig>
  ) => Promise<GetServerSidePropsResult<Props>>
) {
  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<Props>> => {
    const webServerRequest = ctx.req as unknown as WebServerRequest;
    let authedToken: AuthedToken | undefined;
    try {
      ok(webServerRequest.context, "Expected a context on this request");

      const token = await verifyCookies(
        webServerRequest.context.sessionStore,
        nookies.get(ctx)
      );
      if (!token.error) {
        authedToken = token.auth;
        addToLogContext({
          sessionId: token.auth.sessionId,
          userId: token.auth.userId,
        });
      }
      if (process.env.OPEN_ADMIN_ACCESS !== "1" && config.auth !== "optional") {
        const maybeRedirect = maybeTokenRedirect(ctx, token);
        if (maybeRedirect) {
          return maybeRedirect;
        }
        okOrAPIError(!token.error, "unauthorized");
        if (config.auth === "admin") {
          const userEntity = await webServerRequest.context.worldApi.get(
            token.auth.userId
          );
          if (!evaluateRole(userEntity?.userRoles()?.roles, "admin")) {
            log.warn("Unauthorized attempt at admin endpoint", {
              userId: token.auth.userId,
            });
            throw new APIError("unauthorized");
          }
        }
      }
      return await handler({
        config,
        serverSidePropsContext: ctx,
        context: webServerRequest.context,
        auth: (token.error
          ? undefined
          : token.auth) as TypedRequest<TConfig>["auth"],
        query:
          config.query !== undefined
            ? parseOrApiError(config.query, ctx.query)
            : undefined,
      });
    } catch (error: any) {
      await adjustResponseForError(
        webServerRequest.context,
        authedToken,
        ctx.res,
        error
      );
      return {
        props: { serverError: true },
      } as unknown as GetServerSidePropsResult<Props>;
    }
  };
}
