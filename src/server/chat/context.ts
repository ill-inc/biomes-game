import type { ChatServer } from "@/server/chat/server";
import type { PlayerSpatialObserver } from "@/server/shared/chat/player_observer";
import type { RedisChatDistributor } from "@/server/shared/chat/redis/distribution";
import type { SharedServerContext } from "@/server/shared/context";
import type { DiscordBot } from "@/server/shared/discord";
import type { WorldApi } from "@/server/shared/world/api";
import type { ServerCache } from "@/server/web/server_cache";

export interface ChatServerContext extends SharedServerContext {
  chatServer: ChatServer;
  discordBot: DiscordBot;
  playerSpatialObserver: PlayerSpatialObserver;
  redisChatDistributor: RedisChatDistributor;
  serverCache: ServerCache;
  worldApi: WorldApi;
}
