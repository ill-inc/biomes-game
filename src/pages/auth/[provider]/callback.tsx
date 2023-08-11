import { ensurePlayerExists } from "@/server/logic/utils/players";
import {
  connectForeignAuth,
  findLinkForForeignAuth,
} from "@/server/shared/auth/auth_link";
import {
  clearAuthCookies,
  clearCallbackFailedCookie,
  getDeviceIdCookie,
  markCallbackFailed,
  setAuthCookies,
  verifyCookies,
} from "@/server/shared/auth/cookies";
import {
  finishForeignAuth,
  getForeignAuthDefaultUsername,
  validateProvider,
} from "@/server/shared/auth/foreign";
import type { ForeignAccountProfile } from "@/server/shared/auth/types";
import type { DiscordBot } from "@/server/shared/discord";
import type {
  WebServerContextSubset,
  WebServerRequest,
} from "@/server/web/context";
import { validateInviteCode } from "@/server/web/db/invite_codes";
import { getUserOrCreateIfNotExists } from "@/server/web/db/users";
import { findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { postJoinObserverLinkToDiscord } from "@/server/web/util/discord";
import type { APIErrorCode } from "@/shared/api/errors";
import { reportFunnelStage } from "@/shared/funnel";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { ok } from "assert";
import type { IncomingMessage } from "http";
import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import nookies from "nookies";
import { useEffect } from "react";

type Props = {
  redirect: true | false | "force";
};

async function checkDiscordMembership(
  discordBot: DiscordBot,
  discordId: string,
  req: IncomingMessage
): Promise<boolean> {
  if (await discordBot.checkForServerPresence(discordId)) {
    reportFunnelStage("inDiscord", {
      bdid: getDeviceIdCookie(req),
    });
    return true;
  }

  return false;
}

async function ensureLogicHasPlayer(
  deps: WebServerContextSubset<"worldApi">,
  userId: BiomesId,
  username: string
) {
  const editor = deps.worldApi.edit();
  await ensurePlayerExists(editor, userId, username);
  await editor.commit();
}

export async function getServerSideProps(
  ctx: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Props>> {
  const req: WebServerRequest = ctx.req as unknown as WebServerRequest;
  ok(req.context, "Expected a context object on this request");

  const finish = (code?: APIErrorCode): GetServerSidePropsResult<Props> => {
    if (code) {
      clearAuthCookies(ctx.res);
    }
    if (provider === "email" || provider === "dev") {
      log.info("Authentication process finished", {
        code,
      });
      clearCallbackFailedCookie(ctx.res);
      if (code) {
        return {
          notFound: true,
        };
      }
      return {
        props: {
          redirect: provider === "email" ? "force" : true,
        },
      };
    }
    markCallbackFailed(ctx.res, code);
    return {
      props: {
        redirect: false,
      },
    };
  };

  const { db, discordBot, idGenerator, sessionStore } = req.context;
  const provider = validateProvider(ctx.query.provider);
  let foreignAccountProfile!: ForeignAccountProfile;
  try {
    foreignAccountProfile = await finishForeignAuth(db, provider, ctx);
  } catch (error) {
    log.warn("Failed to complete login", { error });
    return finish("unauthorized");
  }

  let link = await findLinkForForeignAuth(
    db,
    provider,
    foreignAccountProfile.id
  );
  if (!link) {
    // No link, need to create one.

    // See if there is an existing user ID to use.
    let userId: BiomesId | undefined;
    if (foreignAccountProfile.linkExisting) {
      // Linking existing account, need to be logged in.
      const token = await verifyCookies(sessionStore, nookies.get(ctx));
      okOrAPIError(!token.error, "unauthorized", "Not logged in");
      userId = token.auth.userId;
    } else {
      // No user ID, validate they're permitted to create a new user.
      if (
        !CONFIG.instantAccessAuthProviders.includes(provider) &&
        !(await validateInviteCode(db, foreignAccountProfile.inviteCode)) &&
        !(
          provider === "discord" &&
          (await checkDiscordMembership(
            discordBot,
            foreignAccountProfile.id,
            req
          ))
        )
      ) {
        // No legacy user, no invite code - not permitted.
        log.warn(
          "User cannot be created without a valid invite code or discord presence.",
          {
            profile: foreignAccountProfile,
          }
        );
        return finish("not_found");
      }
      // New user, generate an ID.
      userId = await idGenerator.next();
    }

    link = await connectForeignAuth(
      db,
      provider,
      foreignAccountProfile,
      userId
    );
  }

  let user = await findByUID(db, link.userId, true);
  if (!user) {
    // User needs to be created, partial link from before.
    log.info(`Creating user ${link.userId}, from ${link?.kind}:${link.id}`);
    user = await getUserOrCreateIfNotExists(
      db,
      link.userId,
      getForeignAuthDefaultUsername(foreignAccountProfile),
      foreignAccountProfile.inviteCode
    );
    await ensureLogicHasPlayer(
      req.context,
      user.id,
      user.username ?? "new user"
    );
    log.info(`Sending welcome message to ${user.id}`);
    fireAndForget(
      discordBot.sendWelcomeMessage(user.id),
      `Error sending welcome message to ${user.id}`
    );
    fireAndForget(
      postJoinObserverLinkToDiscord(user, foreignAccountProfile, ctx.req),
      `Error posting join observer link to discord for ${user.id}`
    );
  }
  if (user.disabled) {
    log.warn("User cannot login as they are disabled.", {
      profile: foreignAccountProfile,
      id: user.id,
    });
    return finish("unauthorized");
  }

  // At this point we've got a user and a link, we're logged in.
  const session = await sessionStore.createSession(link.userId);
  setAuthCookies(ctx.res, session);
  reportFunnelStage("authenticated", {
    userId: user.id,
    bdid: getDeviceIdCookie(ctx.req),
    extra: {
      provider,
    },
  });
  return finish();
}

export const CallbackPage: React.FunctionComponent<Props> = ({ redirect }) => {
  useEffect(() => {
    switch (redirect) {
      case true:
        window.location.href = "/";
        break;
      case "force":
        window.location.href = "/?forceGame=true";
        break;
      default:
        window.close();
    }
  }, []);
  return <></>;
};

export default CallbackPage;
