import { allUserAuthLinksOfKind } from "@/server/shared/auth/auth_link";
import { getSecret } from "@/server/shared/secrets";
import type { BDB } from "@/server/shared/storage";
import {
  simpleItemThumbnailUserNotification,
  simplePostNotification,
  simpleUserNotification,
  simpleUserTextNotification,
} from "@/server/web/util/discord";
import { BackgroundTaskController } from "@/shared/abort";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ChatMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { Latch, sleep } from "@/shared/util/async";
import { anyMapValue } from "@/shared/util/collections";
import {
  asyncBackoffOnAllErrors,
  asyncBackoffOnAllErrorsUntilTruthy,
} from "@/shared/util/retry_helpers";
import type { UnionValue } from "@/shared/util/type_helpers";
import { passNever } from "@/shared/util/type_helpers";
import { maybeFormatCurrency } from "@/shared/util/view_helpers";
import { ok } from "assert";
import type { Invite, MessageCreateOptions, TextChannel } from "discord.js";
import { Client, DiscordAPIError, Events, GatewayIntentBits } from "discord.js";
import { compact } from "lodash";
import md5 from "md5";

export interface DiscordBot {
  stop(): Promise<void>;
  createInvite(): Promise<Invite>;
  sendPushNotifications(userId: BiomesId, mail: Envelope[]): Promise<void>;
  sendWelcomeMessage(userId: BiomesId): Promise<void>;
  checkForServerPresence(discordId: string): Promise<boolean>;
  grantPlaytesterRole(userId: BiomesId): Promise<void>;
  setRoleMembers(roleId: string, members: Iterable<BiomesId>): Promise<void>;
}

const membershipCheckRequest = createCounter({
  name: "discord_membership_check_requests",
  help: "Number of requests to check for discord membership",
});

const membershipCheckResult = createCounter({
  name: "discord_membership_check_results",
  help: "Number of results from checking for discord membership",
  labelNames: ["outcome"],
});

export class DisabledDiscordBot implements DiscordBot {
  async stop() {}
  createInvite(): Promise<Invite> {
    throw new Error("Discord bot is disabled");
  }
  async sendPushNotifications(
    _userId: BiomesId,
    _mail: Envelope[]
  ): Promise<void> {}
  async sendWelcomeMessage(_userId: BiomesId): Promise<void> {}
  async checkForServerPresence(_discordId: string): Promise<boolean> {
    return false;
  }
  async grantPlaytesterRole(_userId: BiomesId): Promise<void> {
    // Note, this is a no-op, not an error as it's better for dev.
  }
  async setRoleMembers(
    _roleId: string,
    _members: Iterable<BiomesId>
  ): Promise<void> {}
}

function isUnknownMemberError(
  error: any
): error is DiscordAPIError & { code: 10007 } {
  return error instanceof DiscordAPIError && error.code === 10007;
}

export class DiscordBotImpl implements DiscordBot {
  private readonly controller = new BackgroundTaskController();
  private cachedMembership = new Map<string, string[]>();
  private grantedPlaytesterRole = new Set<BiomesId>();

  private constructor(
    private readonly db: BDB,
    private readonly discordClient: Client
  ) {
    this.controller.runInBackground("refresh-members", (signal) =>
      this.periodicallyRefreshMembers(signal)
    );
  }

  async stop() {
    await this.controller.abortAndWait();
    this.discordClient.destroy();
  }

  static login(db: BDB): Promise<DiscordBotImpl> {
    const discordToken = getSecret("biomes-discord-bot-token");
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });
    return new Promise<DiscordBotImpl>((resolve, reject) => {
      client.once(Events.ClientReady, async (c) => {
        log.info(`Discord notifier logged in as ${c.user.tag}`);
        resolve(new DiscordBotImpl(db, c));
      });

      log.info("Logging in to Discord");
      void client.login(discordToken).catch(reject);
    });
  }

  private async resolveDiscordId(
    userId: BiomesId
  ): Promise<string | undefined> {
    const links = await allUserAuthLinksOfKind(
      this.db,
      "foreign:discord",
      userId
    );

    if (links.length > 0) {
      const discordId = links[0].profile.id;
      if (discordId) {
        return String(discordId);
      }
    }

    return CONFIG.manualUserIdToDiscord.find(([id]) => id === userId)?.[1];
  }

  async createInvite() {
    const channel = await this.discordClient.channels.fetch(
      CONFIG.discordEarlyAccessGeneralChannelId
    );
    ok(channel, "No channel found");

    const t = channel as TextChannel;
    return t.createInvite({
      maxUses: 1,
      unique: true,
      maxAge: 7 * 3600 * 24,
    });
  }

  private async periodicallyRefreshMembers(signal: AbortSignal) {
    while (await sleep(CONFIG.discordRefreshMemberIntervalMs, signal)) {
      try {
        await this.refreshMembers();
      } catch (error) {
        log.error("Error refreshing Discord members", { error });
      }
    }
  }

  private async getGuild() {
    try {
      return await this.discordClient.guilds.fetch(
        CONFIG.discordGatingServerId
      );
    } catch (error) {
      log.error("Error fetching Discord guild", { error });
      throw error;
    }
  }

  private async refreshMembers() {
    const guild = await this.getGuild();
    let after: string | undefined;
    const members = new Map<string, string[]>();
    while (true) {
      const batch = await guild.members.list({
        after,
        limit: 100,
      });
      if (batch.size === 0) {
        break;
      }
      for (const [id, member] of batch) {
        members.set(
          id,
          member.roles.valueOf().map((r) => r.id)
        );
      }
      after = batch.lastKey();
    }
    this.cachedMembership = members;
  }

  private async getServerMembership(discordId: string) {
    const guild = await this.getGuild();
    try {
      return await guild.members.fetch(discordId);
    } catch (error) {
      if (isUnknownMemberError(error)) {
        return undefined;
      }
      log.error("Error fetching Discord member", { discordId, error });
      throw error;
    }
  }

  async checkForServerPresence(discordId: string) {
    membershipCheckRequest.inc();
    if (this.cachedMembership.has(discordId)) {
      membershipCheckResult.inc({ outcome: "cached" });
      return true;
    }
    try {
      const isMember = await asyncBackoffOnAllErrors(
        async () => !!(await this.getServerMembership(discordId)),
        {
          maxAttempts: 3,
          baseMs: 100,
        }
      );
      if (isMember) {
        if (!this.cachedMembership.has(discordId)) {
          this.cachedMembership.set(discordId, []);
        }
        membershipCheckResult.inc({ outcome: "in" });
      } else {
        membershipCheckResult.inc({ outcome: "out" });
      }
      return isMember;
    } catch (error) {
      membershipCheckResult.inc({ outcome: "error" });
      throw error;
    }
  }

  async grantPlaytesterRole(userId: BiomesId) {
    if (this.grantedPlaytesterRole.has(userId)) {
      return;
    }
    await asyncBackoffOnAllErrors(
      async () => {
        const discordId = await this.resolveDiscordId(userId);
        if (!discordId) {
          // TODO: Perhaps retry later?
          // Note: As-is this will be retried after a deploy/restart.
          this.grantedPlaytesterRole.add(userId);
          return;
        }
        try {
          const guild = await this.getGuild();
          await guild.members.addRole({
            user: discordId,
            role: CONFIG.discordPlaytesterRoleId,
            reason: "Entered the game",
          });
        } catch (error) {
          if (!isUnknownMemberError(error)) {
            throw error;
          }
        }
        // TODO: Perhaps retry later?
        this.grantedPlaytesterRole.add(userId);
      },
      {
        maxAttempts: 3,
        baseMs: 500,
      }
    );
  }

  async setRoleMembers(
    roleId: string,
    members: Iterable<BiomesId>
  ): Promise<void> {
    const targetMembers = new Set(
      compact(
        await Promise.all(
          Array.from(members).map((userId) => this.resolveDiscordId(userId))
        )
      )
    );
    const guild = await this.getGuild();
    const role = await guild.roles.fetch(roleId);
    ok(role, `Role ${roleId} not found`);

    const existingMembers = new Set(role.members.keys());
    for (const member of existingMembers) {
      if (targetMembers.has(member)) {
        continue;
      }
      await guild.members.removeRole({
        user: member,
        role: roleId,
      });
    }
    for (const member of targetMembers) {
      if (existingMembers.has(member)) {
        continue;
      }
      await guild.members.addRole({
        user: member,
        role: roleId,
      });
    }
  }

  private async sendDiscordMessages(
    userId: BiomesId,
    messages: MessageCreateOptions[]
  ) {
    const discordId = await this.resolveDiscordId(userId);
    if (!discordId || messages.length === 0) {
      return;
    }

    const channel = await this.discordClient.users.fetch(discordId);
    for (const message of messages) {
      await channel.send(message);
    }
  }

  async sendPushNotifications(userId: BiomesId, mail: Envelope[]) {
    const discordId = await this.resolveDiscordId(userId);
    if (!discordId) {
      return;
    }

    const messagePromises = mail.map(async (e) => {
      const ret = await this.discordMessage(e);
      if (ret) {
        if (e.id.length >= 25) {
          ret.nonce = md5(e.id).slice(0, 24);
        } else {
          ret.nonce = e.id;
        }
      }

      return ret;
    });
    const messages = compact(await Promise.all(messagePromises));
    await this.sendDiscordMessages(userId, messages);
  }

  async sendWelcomeMessage(userId: BiomesId): Promise<void> {
    await this.sendDiscordMessages(userId, [
      await simpleUserTextNotification(CONFIG.discordBotWelcomeMessage),
    ]);
  }

  private async discordMessage(
    envelope: Envelope
  ): Promise<MessageCreateOptions | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const message = envelope.message as UnionValue<
      ChatMessage,
      "text" | (typeof CONFIG.activityMessagesToPush)[number]
    >;
    switch (message.kind) {
      case "text":
        return simpleUserNotification(
          this.db,
          `{username} DMed you '${message.content}'`,
          envelope.from
        );
      case "like":
        if (message.documentType !== "post") {
          return;
        }

        return simplePostNotification(
          this.db,
          "{username} liked your photo",
          message.documentId,
          envelope.from
        );
      case "comment":
        if (message.documentType !== "post") {
          return;
        }
        return simplePostNotification(
          this.db,
          `{username} commented '${message.comment}' on your photo`,
          message.documentId,
          envelope.from
        );
      case "follow":
        return simpleUserNotification(
          this.db,
          "{username} followed you",
          envelope.from
        );
      case "tag":
        return simplePostNotification(
          this.db,
          `{username} tagged you in their photo`,
          message.documentId,
          envelope.from
        );
      case "enter_my_robot":
        return simpleUserNotification(
          this.db,
          "{username} entered your land",
          message.visitorId
        );
      case "robotVisitorMessage":
        return simpleUserNotification(
          this.db,
          `{username} sent you a message via your robot: ${message.message}`,
          message.visitorId
        );
      case "robotExpired":
        return simpleUserNotification(
          this.db,
          "Your robot just expired, pick it up inside the game",
          message.entityId
        );
      case "purchase": {
        const bag = stringToItemBag(message.bag);
        const payment = stringToItemBag(message.payment);
        const heroItem = anyMapValue(bag);
        const paymentAmount = anyMapValue(payment);

        const title = `{username} just purchased your ${
          heroItem?.item.displayName ?? "item"
        } for ${maybeFormatCurrency(
          BikkieIds.bling,
          paymentAmount?.count,
          "locale"
        )} Bling`;
        return simpleItemThumbnailUserNotification(
          this.db,
          title,
          heroItem?.item,
          message.entityId
        );
      }
      case "minigame_royalty": {
        const title = `{username} just joined your minigame and you earned ${maybeFormatCurrency(
          BikkieIds.bling,
          message.royalty,
          "locale"
        )} Bling`;
        return simpleUserNotification(this.db, title, message.joinerId);
      }
      case "invitedToTeam":
        break;
      case "joined_my_team":
        return simpleUserNotification(
          this.db,
          "{username} joined your team",
          message.player
        );
      case "mailReceived":
        const title = `{username} just left mail at your mailbox`;
        return simpleUserNotification(this.db, title, message.sender);
      case "requestedToJoinTeam":
      case "requestToJoinTeamAccepted":
        break;
      default:
        passNever(message);
    }
  }
}

export class LazyDiscordBot implements DiscordBot {
  private readonly controller = new BackgroundTaskController();
  private bot: Promise<DiscordBot>;

  constructor(createFn: () => Promise<DiscordBot>) {
    this.bot = createFn();
    this.controller.runInBackground("ensure-connected", (signal) => {
      // Use a latch to delay the recreate to the next cycle of the backoff
      // loop rather than doing it immediately.
      const recreate = new Latch();
      return asyncBackoffOnAllErrorsUntilTruthy(
        async () => {
          if (signal.aborted) {
            // Shutting down, stop attempting.
            return true;
          }
          recreate.signal();
          try {
            // Wait for the current bot to log in.
            return await this.bot;
          } catch (error) {
            log.error("Failed to login to Discord", { error });
            recreate.reset();
            this.bot = recreate.wait().then(() => createFn());
            throw error;
          }
        },
        {
          baseMs: 2500,
          exponent: 1.25,
          maxMs: 30_000,
        }
      );
    });
  }

  async stop() {
    await this.controller.abortAndWait();
    await this.bot.then((b) => b.stop()).catch(() => {});
  }

  createInvite(): Promise<Invite> {
    return this.bot.then((b) => b.createInvite());
  }

  sendPushNotifications(userId: BiomesId, mail: Envelope[]): Promise<void> {
    return this.bot.then((b) => b.sendPushNotifications(userId, mail));
  }

  sendWelcomeMessage(userId: BiomesId): Promise<void> {
    return this.bot.then((b) => b.sendWelcomeMessage(userId));
  }

  checkForServerPresence(discordId: string): Promise<boolean> {
    return this.bot.then((b) => b.checkForServerPresence(discordId));
  }

  grantPlaytesterRole(userId: BiomesId): Promise<void> {
    return this.bot.then((b) => b.grantPlaytesterRole(userId));
  }

  async setRoleMembers(
    roleId: string,
    members: Iterable<BiomesId>
  ): Promise<void> {
    return this.bot.then((b) => b.setRoleMembers(roleId, members));
  }
}

export async function registerDiscordBot<C extends { db: BDB }>(
  loader: RegistryLoader<C>
): Promise<DiscordBot> {
  const enabled =
    process.env.NODE_ENV === "production" || process.env.ALLOW_DEV_DISCORD;
  if (!enabled) {
    return new DisabledDiscordBot();
  }
  const db = await loader.get("db");
  return new LazyDiscordBot(() => DiscordBotImpl.login(db));
}
