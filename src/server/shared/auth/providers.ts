import { DevProvider } from "@/server/shared/auth/dev";
import { DiscordProvider } from "@/server/shared/auth/discord";
import { EmailProvider } from "@/server/shared/auth/email";
import { GoogleProvider } from "@/server/shared/auth/google";
import { TwitchProvider } from "@/server/shared/auth/twitch";
import { TwitterProvider } from "@/server/shared/auth/twitter";

export const ALL_PROVIDERS = {
  discord: () => new DiscordProvider(),
  google: () => new GoogleProvider(),
  twitter: () => new TwitterProvider(),
  email: () => new EmailProvider(),
  dev: () => new DevProvider(),
  twitch: () => new TwitchProvider(),
} as const;

export type ForeignAuthProviderName = keyof typeof ALL_PROVIDERS;
