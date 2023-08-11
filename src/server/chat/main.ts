import type { ChatServerContext } from "@/server/chat/context";
import { registerChatServer } from "@/server/chat/server";
import { registerPlayerSpatialObserver } from "@/server/shared/chat/player_observer";
import { registerRedisChatDistributor } from "@/server/shared/chat/redis/distribution";
import { sharedServerContext } from "@/server/shared/context";
import { registerDiscordBot } from "@/server/shared/discord";
import { runServer } from "@/server/shared/main";
import { registerWorldApi } from "@/server/shared/world/register";
import { registerCacheClient } from "@/server/web/server_cache";
import { RegistryBuilder } from "@/shared/registry";

void runServer(
  "chat",
  (signal) =>
    new RegistryBuilder<ChatServerContext>()
      .install(sharedServerContext)
      .bind("chatServer", registerChatServer)
      .bind("discordBot", registerDiscordBot)
      .bind("playerSpatialObserver", registerPlayerSpatialObserver)
      .bind("redisChatDistributor", registerRedisChatDistributor)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("serverCache", registerCacheClient)
      .build(),
  async (context) => {
    await context.chatServer.start();
  }
);
