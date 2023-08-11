import { OAuth2Provider } from "@/server/shared/auth/oauth2";
import type { IncompleteForeignAccountProfile } from "@/server/shared/auth/types";
import { getSecret } from "@/server/shared/secrets";

interface TwitterProfileInfo {
  data: {
    id: string;
    username: string;
  };
}

export class TwitterProvider extends OAuth2Provider {
  static CLIENT_ID = "QkJiRjhrR0JkYTBNV2REaUViNEM6MTpjaQ";
  constructor() {
    super({
      client: {
        id: TwitterProvider.CLIENT_ID,
        secret: getSecret("twitter-oauth-client-secret"),
      },
      auth: {
        authorizeURL: "https://twitter.com/i/oauth2/authorize",
        tokenURL: "https://api.twitter.com/2/oauth2/token",
        scope: "tweet.read users.read",
        extraTokenParams: {
          // Twitter is weird, specify this twice.
          client_id: TwitterProvider.CLIENT_ID,
        },
      },
    });
  }

  protected override async tokenToProfile(
    token: string
  ): Promise<IncompleteForeignAccountProfile> {
    const response = await this.getWithToken<TwitterProfileInfo>(
      "https://api.twitter.com/2/users/me?user.fields=id",
      token
    );
    return {
      id: response.data.id,
      username: response.data.username,
    };
  }
}
