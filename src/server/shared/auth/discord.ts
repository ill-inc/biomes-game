import { OAuth2Provider } from "@/server/shared/auth/oauth2";
import type { IncompleteForeignAccountProfile } from "@/server/shared/auth/types";
import { getSecret } from "@/server/shared/secrets";

// Discord's profile format.
interface ProfileInfo {
  id: string;
  username: string;
  email: string | null;
}

export class DiscordProvider extends OAuth2Provider {
  constructor() {
    super({
      client: {
        id: "1040832298788069449",
        secret: getSecret("discord-oauth-client-secret"),
      },
      auth: {
        authorizeURL: "https://discord.com/oauth2/authorize",
        tokenURL: "https://discord.com/api/oauth2/token",
        scope: "identify email",
      },
    });
  }

  protected override async tokenToProfile(
    token: string
  ): Promise<IncompleteForeignAccountProfile> {
    const response = await this.getWithToken<ProfileInfo>(
      "https://discord.com/api/users/@me",
      token
    );
    const profile: IncompleteForeignAccountProfile = {
      id: response.id,
      username: response.username,
    };
    if (response.email) {
      profile.email = response.email;
    }
    return profile;
  }
}
