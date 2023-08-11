import { OAuth2Provider } from "@/server/shared/auth/oauth2";
import type { IncompleteForeignAccountProfile } from "@/server/shared/auth/types";
import { getSecret } from "@/server/shared/secrets";

// Google's OpenID profile format.
interface OpenIdProfileInfo {
  sub: string;
  email: string;
}

export class GoogleProvider extends OAuth2Provider {
  constructor() {
    super({
      client: {
        id: "336371362626-0mia4nshvoco9rqqib2dt22k329p55sr.apps.googleusercontent.com",
        secret: getSecret("google-oauth-client-secret"),
      },
      auth: {
        authorizeURL: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenURL: "https://www.googleapis.com/oauth2/v4/token",
        scope: "email",
      },
    });
  }

  protected override async tokenToProfile(
    token: string
  ): Promise<IncompleteForeignAccountProfile> {
    const response = await this.getWithToken<OpenIdProfileInfo>(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      token
    );
    return {
      id: response.sub,
      email: response.email,
    };
  }
}
