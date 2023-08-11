import type { ForeignAuthProviderName } from "@/server/shared/auth/providers";
import type { WebServerApiRequest } from "@/server/web/context";
import type { GetServerSidePropsContext, NextApiResponse } from "next";

export const PLAYTEST_MARKER_INVITE_CODE = "playtest";

// These fields are deliberately verbose as they are encoded
// in the signed JWT token used by stateful processes.
export type AuthFlowState = {
  // user agent
  ua?: string;
  // invite code
  ic?: string;
  // link existing
  le?: "1" | "0";
};

export type ForeignAccountProfile = {
  provider: ForeignAuthProviderName;
  id: string;
  inviteCode?: string;
  email?: string;
  username?: string;
  linkExisting?: boolean;
};

export type IncompleteForeignAccountProfile = Omit<
  ForeignAccountProfile,
  "provider" | "inviteCode"
>;

export interface AuthFlowContext<TState extends AuthFlowState = AuthFlowState> {
  supportsCreation: boolean;
  findExistingLink(key: string): Promise<unknown>;
  encodeState(
    extraState: Omit<TState, keyof AuthFlowState>,
    expiresIn?: string
  ): string;
  getCallbackUri(additionalArgs?: Record<string, string>): string;
}

export interface ForeignAuthProvider<
  TState extends AuthFlowState = AuthFlowState
> {
  start(
    authContext: AuthFlowContext<TState>,
    request: WebServerApiRequest,
    response: NextApiResponse
  ): Promise<unknown>;
  finish(
    authContext: AuthFlowContext<TState>,
    ctx: GetServerSidePropsContext,
    state: TState
  ): Promise<IncompleteForeignAccountProfile>;
}
