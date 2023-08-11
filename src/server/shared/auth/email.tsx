import LoginEmail from "@/email/login";
import type {
  AuthFlowContext,
  AuthFlowState,
  ForeignAuthProvider,
  IncompleteForeignAccountProfile,
} from "@/server/shared/auth/types";
import { getSecret } from "@/server/shared/secrets";
import type { WebServerApiRequest } from "@/server/web/context";
import { validateString } from "@/server/web/errors";
import { APIError } from "@/shared/api/errors";
import { render } from "@react-email/render";
import type { GetServerSidePropsContext, NextApiResponse } from "next";
import * as postmark from "postmark";

export interface EmailAuthFlowState extends AuthFlowState {
  e: string;
}

export async function sendLoginEmail(email: string, link: string) {
  const client = new postmark.ServerClient(
    getSecret("postmark-auth-transactional")
  );

  await client.sendEmail({
    To: email,
    From: "Biomes Login <noreply@biomes.gg>",
    Subject: "Login to Biomes",
    HtmlBody: render(<LoginEmail link={link} />, { pretty: true }),
    MessageStream: "outbound",
  });
}

export class EmailProvider implements ForeignAuthProvider<EmailAuthFlowState> {
  async start(
    authContext: AuthFlowContext<EmailAuthFlowState>,
    request: WebServerApiRequest,
    response: NextApiResponse
  ) {
    const email = validateString(request.query.email);
    if (!authContext.supportsCreation) {
      if (!(await authContext.findExistingLink(email))) {
        throw new APIError("not_found");
      }
    }

    const callbackUri = authContext.getCallbackUri({
      state: authContext.encodeState({ e: email }, "15m"),
    });

    await sendLoginEmail(email, callbackUri);
    response.status(200).json({});
  }

  async finish(
    _authContext: AuthFlowContext<EmailAuthFlowState>,
    _ctx: GetServerSidePropsContext,
    state: EmailAuthFlowState
  ): Promise<IncompleteForeignAccountProfile> {
    return {
      id: state.e,
      email: state.e,
    };
  }
}
