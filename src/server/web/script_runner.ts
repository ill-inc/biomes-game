import { startConfigWatchers } from "@/server/shared/config_watchers";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { WebServerContext } from "@/server/web/context";
import { webServerContext } from "@/server/web/main";
import { log } from "@/shared/logging";
import dotenv from "dotenv";

export async function runWebServerScript(
  script: (context: WebServerContext) => Promise<any>
) {
  dotenv.config();
  await bootstrapGlobalSecrets();
  log.info("Bootstrapping context for script...");
  const context = await webServerContext();

  await loadVoxeloo();
  const configWatcher = await startConfigWatchers();
  if (!configWatcher) {
    log.fatal("Failed to load initial biomes config!");
    return;
  }
  await configWatcher.close();
  try {
    log.info("Script beginning...");
    await script(context);
  } catch (error) {
    log.error(`Error in script: ${error}`);
  } finally {
    setTimeout(() => {
      process.exit();
    }, 10);
  }
}
