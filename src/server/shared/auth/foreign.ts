import { invalidUsernameReason } from "@/client/util/auth";
import { findLinkForForeignAuth } from "@/server/shared/auth/auth_link";
import type { ForeignAuthProviderName } from "@/server/shared/auth/providers";
import { ALL_PROVIDERS } from "@/server/shared/auth/providers";
import type {
  AuthFlowContext,
  AuthFlowState,
  ForeignAccountProfile,
  ForeignAuthProvider,
} from "@/server/shared/auth/types";
import { getSecret } from "@/server/shared/secrets";
import type { BDB } from "@/server/shared/storage";
import type { WebServerApiRequest } from "@/server/web/context";
import { okOrAPIError, validateString } from "@/server/web/errors";
import { crc32 } from "crc";
import * as jwt from "jsonwebtoken";
import type { GetServerSidePropsContext, NextApiResponse } from "next";

export function validateProvider(item: any): ForeignAuthProviderName {
  const providerName = validateString(item) as ForeignAuthProviderName;
  okOrAPIError(ALL_PROVIDERS[providerName], "bad_param");
  return providerName;
}

function encodedUserAgent(userAgent?: string) {
  if (!userAgent) {
    return "";
  }
  return crc32(userAgent).toString(16);
}

export function encodeAuthState<TState extends AuthFlowState>(
  state: TState,
  expiresIn = "1h"
) {
  return jwt.sign(state, getSecret("foreign-auth-state"), {
    algorithm: "HS512",
    expiresIn,
  });
}
class AuthFlowContextImpl<TState extends AuthFlowState>
  implements AuthFlowContext<TState>
{
  private readonly inviteCode: string;

  constructor(
    private readonly db: BDB,
    private readonly provider: ForeignAuthProviderName,
    private readonly request: WebServerApiRequest,
    private readonly linkExisting: boolean
  ) {
    this.inviteCode = validateString(request.query?.inviteCode ?? "");
  }

  get supportsCreation() {
    return !!this.inviteCode;
  }

  findExistingLink(key: string) {
    return findLinkForForeignAuth(this.db, this.provider, key);
  }

  encodeState(
    extraState?: Omit<TState, keyof AuthFlowState>,
    expiresIn = "1h"
  ): string {
    const state = <TState>{
      ...extraState,
      ua: encodedUserAgent(this.request.headers["user-agent"]),
      ic: this.inviteCode,
    };
    if (this.linkExisting) {
      state.le = "1";
    }
    return encodeAuthState(state, expiresIn);
  }

  getCallbackUri(additionalArgs?: Record<string, string>): string {
    const url = new URL(
      `/auth/${this.provider}/callback`,
      `http://${this.request.headers.host}`
    );
    if (additionalArgs) {
      for (const [key, value] of Object.entries(additionalArgs)) {
        url.searchParams.append(key, value);
      }
    }
    if (process.env.NODE_ENV === "production") {
      url.protocol = "https:";
    }
    return url.toString();
  }
}

const providers = new Map<ForeignAuthProviderName, ForeignAuthProvider>();

function getProvider(
  providerName: ForeignAuthProviderName
): ForeignAuthProvider {
  let existing = providers.get(providerName);
  if (existing === undefined) {
    existing = ALL_PROVIDERS[providerName]();
    providers.set(providerName, existing);
  }
  return existing;
}

export async function startForeignAuth(
  db: BDB,
  provider: ForeignAuthProviderName,
  request: WebServerApiRequest,
  response: NextApiResponse,
  linkExisting: boolean
) {
  await getProvider(provider).start(
    new AuthFlowContextImpl(db, provider, request, linkExisting),
    request,
    response
  );
}

function checkUserAgent(userAgent?: string, userAgentHash?: string) {
  okOrAPIError(
    !userAgentHash ||
      userAgent === userAgentHash ||
      encodedUserAgent(userAgent) === userAgentHash,
    "unauthorized"
  );
}

function validateState<TState extends AuthFlowState>(
  ctx: GetServerSidePropsContext
) {
  const state = validateString(ctx.query.state);
  const data = jwt.verify(state, getSecret("foreign-auth-state"), {
    algorithms: ["HS512"],
  }) as TState;
  checkUserAgent(ctx.req.headers["user-agent"], data.ua);
  return data;
}

async function finishWithProvider<TState extends AuthFlowState>(
  db: BDB,
  providerName: ForeignAuthProviderName,
  provider: ForeignAuthProvider<TState>,
  ctx: GetServerSidePropsContext
) {
  const state = validateState<TState>(ctx);
  return {
    ...(await provider.finish(
      new AuthFlowContextImpl(
        db,
        providerName,
        ctx.req as WebServerApiRequest,
        state.le === "1"
      ),
      ctx,
      state
    )),
    provider: providerName,
    inviteCode: state.ic,
    linkExisting: state.le === "1",
  };
}

export async function finishForeignAuth(
  db: BDB,
  providerName: ForeignAuthProviderName,
  ctx: GetServerSidePropsContext
): Promise<ForeignAccountProfile> {
  const provider = getProvider(providerName);
  return finishWithProvider(db, providerName, provider, ctx);
}

export function getForeignAuthDefaultUsername(
  profile: ForeignAccountProfile
): string | undefined {
  if (profile.username && !invalidUsernameReason(profile.username)) {
    return profile.username;
  }
  if (profile.email) {
    const user = profile.email.split("@")[0];
    if (!invalidUsernameReason(user)) {
      return user;
    }
  }
}
