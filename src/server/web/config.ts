import { parseArgs, stringLiteralCtor } from "@/server/shared/args";
import type { BaseServerConfig } from "@/server/shared/server_config";
import { baseServerArgumentConfig } from "@/server/shared/server_config";

export type AssetServerMode = "none" | "lazy" | "local" | "proxy";

export interface WebServerConfig extends BaseServerConfig {
  assetServerMode: AssetServerMode;
}

export async function registerWebServerConfig(): Promise<WebServerConfig> {
  return parseArgs<WebServerConfig>({
    ...baseServerArgumentConfig,
    assetServerMode: {
      type: stringLiteralCtor("none", "lazy", "local", "proxy"),
      defaultValue: process.env.NODE_ENV === "production" ? "none" : "proxy",
      alias: "a",
    },
  });
}
