import { TwitchProvider } from "@/server/shared/auth/twitch";
import { getSecret } from "@/server/shared/secrets";
import type { TwitchChannel } from "@/server/shared/twitch/types";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { RegistryLoader } from "@/shared/registry";
import net from "net";

// Required until we upgrade node: https://github.com/nodejs/node/issues/47822
if ((net as any).setDefaultAutoSelectFamily) {
  (net as any).setDefaultAutoSelectFamily(false);
}

export interface TwitchBot {
  getChannel: (channel: string) => Promise<TwitchChannel | undefined>;
}

export class TwitchBotImpl implements TwitchBot {
  private accessToken: string | undefined;
  private expiresAt: number | undefined;

  constructor() {}

  private async authRequest(
    url: string,
    method?: "GET" | "POST",
    body?: any
  ): Promise<any | undefined> {
    if (this.tokenExpired()) {
      await this.login();
    }
    const response = await fetch(`https://api.twitch.tv/${url}`, {
      method: method ?? "GET",
      headers: {
        "Client-Id": TwitchProvider.CLIENT_ID,
        Authorization: `Bearer ${this.accessToken}`,
      },
      body,
    });

    if (!response.ok) {
      return;
    }

    return response.json();
  }

  async getChannel(channel: string): Promise<TwitchChannel | undefined> {
    const params = new URLSearchParams();
    params.set("query", channel);
    const response = await this.authRequest(
      `helix/search/channels?${params.toString()}`,
      "GET"
    );
    if (!response || response.data.length === 0) {
      return;
    }
    const data = response.data[0];

    return {
      id: data.id,
      title: data.title,
      displayName: data.display_name,
      thumbnailUrl: data.thumbnail_url,
    };
  }

  async login() {
    if (!this.tokenExpired()) {
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("client_id", TwitchProvider.CLIENT_ID);
      params.set("client_secret", getSecret("twitch-oauth-client-secret"));
      params.set("grant_type", "client_credentials");
      const response = await fetch(
        `https://id.twitch.tv/oauth2/token?${params.toString()}`,
        { method: "POST" }
      );
      const json = await response.json();
      this.accessToken = json.access_token;
      this.expiresAt = secondsSinceEpoch() + (json.expires_in as number);
    } catch (error) {
      throw new Error(`Failed to login to Twitch: ${error}`);
    }
  }

  private tokenExpired(): boolean {
    const expired =
      this.expiresAt === undefined || this.expiresAt < secondsSinceEpoch();
    if (expired) {
      this.accessToken = undefined;
      this.expiresAt = undefined;
    }
    return expired;
  }
}

export async function registerTwitchBot<C>(
  _loader: RegistryLoader<C>
): Promise<TwitchBot> {
  const bot = new TwitchBotImpl();
  await bot.login();
  return bot;
}
