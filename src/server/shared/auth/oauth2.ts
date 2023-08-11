import type {
  AuthFlowContext,
  AuthFlowState,
  ForeignAuthProvider,
  IncompleteForeignAccountProfile,
} from "@/server/shared/auth/types";
import type { WebServerApiRequest } from "@/server/web/context";
import { validateString } from "@/server/web/errors";
import { APIError } from "@/shared/api/errors";
import { log } from "@/shared/logging";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { createHash, randomBytes } from "crypto";
import type { GetServerSidePropsContext, NextApiResponse } from "next/types";
import { AuthorizationCode } from "simple-oauth2";

interface OAuthFlowState extends AuthFlowState {
  v: string;
}

// Represents a general OAuth provider configuration, as well as the JWT state
// validation mechnaism.
export abstract class OAuth2Provider
  implements ForeignAuthProvider<OAuthFlowState>
{
  private readonly client: AuthorizationCode;
  private readonly scope?: string;
  private readonly extraTokenParams?: Record<string, string>;

  constructor({
    client,
    auth,
  }: {
    client: {
      id: string;
      secret: string;
    };
    auth: {
      authorizeURL: string;
      tokenURL: string;
      scope?: string;
      extraTokenParams?: Record<string, string>;
    };
  }) {
    this.client = new AuthorizationCode({
      client: {
        id: client.id,
        secret: client.secret,
      },
      auth: {
        tokenHost: auth.tokenURL,
        tokenPath: auth.tokenURL,
        authorizeHost: auth.authorizeURL,
        authorizePath: auth.authorizeURL,
      },
      options: {
        authorizationMethod: "header",
      },
    });
    this.scope = auth.scope;
    this.extraTokenParams = auth.extraTokenParams;
  }

  async start(
    authContext: AuthFlowContext,
    _request: WebServerApiRequest,
    response: NextApiResponse
  ) {
    const verifier = randomBytes(32).toString("base64url");
    const params: Record<string, string> = {
      redirect_uri: authContext.getCallbackUri(),
      code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      state: authContext.encodeState({ v: verifier }),
    };
    if (this.scope) {
      params.scope = this.scope;
    }
    response.redirect(this.client.authorizeURL(params));
  }

  protected async getWithToken<TResponse>(
    url: string,
    token: string,
    { headers }: { headers?: Record<string, string> } = {}
  ) {
    return jsonFetch<TResponse>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...headers,
      },
    });
  }

  // Given the context and a known-valid access token, provide profile information from this.
  protected abstract tokenToProfile(
    token: string
  ): Promise<IncompleteForeignAccountProfile>;

  private async getAccessToken(
    authContext: AuthFlowContext,
    state: OAuthFlowState,
    code: string
  ) {
    const token = await this.client.getToken({
      code,
      ...this.extraTokenParams,
      redirect_uri: authContext.getCallbackUri(),
      code_verifier: state.v,
    } as any);
    return token.token.access_token;
  }

  // Actual validation callback to handle the login.
  async finish(
    authContext: AuthFlowContext,
    ctx: GetServerSidePropsContext,
    state: OAuthFlowState
  ): Promise<IncompleteForeignAccountProfile> {
    const code = validateString(ctx.query.code ?? "");
    let accessToken: string;
    try {
      accessToken = await this.getAccessToken(authContext, state, code);
    } catch (error: any) {
      log.warn(`Could not exchange code for access token: ${error.message}`, {
        error,
      });
      throw new APIError("unauthorized");
    }
    return this.tokenToProfile(accessToken);
  }
}
