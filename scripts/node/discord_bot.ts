import { bootstrapGlobalConfig } from "@/server/shared/config";
import { DiscordBotImpl } from "@/server/shared/discord";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { createBdb, createStorageBackend } from "@/server/shared/storage";

// Discord bot: https://discord.com/developers/applications/1044657561107968061/information
// use secret from secrets

async function go() {
  await bootstrapGlobalSecrets("biomes-discord-bot-token");
  bootstrapGlobalConfig();
  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);
  const bot = await DiscordBotImpl.login(db);

  console.log(await bot.checkForServerPresence("333974257979621379"));
}

go();
