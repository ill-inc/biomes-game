import { OAuth2Provider } from "@/server/shared/auth/oauth2";
import type { IncompleteForeignAccountProfile } from "@/server/shared/auth/types";
import { getSecret } from "@/server/shared/secrets";

// Google's OpenID profile format.
interface TwitchUserInfo {
  id: string;
  login: string;
  email: string;
}

export class TwitchProvider extends OAuth2Provider {
  static CLIENT_ID = "7wshxfxjwcoq3i2mpm3p4dup4yum7d";
  constructor() {
    const secret = getSecret("twitch-oauth-client-secret");
    super({
      client: {
        id: TwitchProvider.CLIENT_ID,
        secret,
      },
      auth: {
        authorizeURL: "https://id.twitch.tv/oauth2/authorize",
        tokenURL: "https://id.twitch.tv/oauth2/token",
        scope: "user:read:email",
        extraTokenParams: {
          client_id: TwitchProvider.CLIENT_ID,
          client_secret: secret,
        },
      },
    });
  }

  protected override async tokenToProfile(
    token: string
  ): Promise<IncompleteForeignAccountProfile> {
    const response = await this.getWithToken<{ data: TwitchUserInfo[] }>(
      "https://api.twitch.tv/helix/users",
      token,
      {
        headers: {
          "Client-ID": TwitchProvider.CLIENT_ID,
        },
      }
    );
    const user = response.data[0];
    return {
      id: user.id,
      username: user.login,
      email: user.email,
    };
  }
}
