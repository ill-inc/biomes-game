import { startConfigWatchers } from "@/server/shared/config_watchers";
import type { SecretKey } from "@/server/shared/secrets";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { log } from "@/shared/logging";
import dotenv from "dotenv";

export async function scriptInit(additionalSecretsNeeded: SecretKey[] = []) {
  dotenv.config();
  await bootstrapGlobalSecrets(...additionalSecretsNeeded);

  const configWatcher = await startConfigWatchers();
  if (!configWatcher) {
    log.fatal("Failed to load initial biomes config!");
    return;
  }
  await configWatcher.close();
}
