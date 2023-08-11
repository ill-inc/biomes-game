import type { ChatApi } from "@/server/shared/chat/api";
import { RedisChatApi } from "@/server/shared/chat/redis/redis";
import { RemoteChatApi, zChatService } from "@/server/shared/chat/remote";
import { HostPort } from "@/server/shared/ports";
import { connectToRedis } from "@/server/shared/redis/connection";
import type { WorldApi } from "@/server/shared/world/api";
import { makeClient } from "@/server/shared/zrpc/client";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";

export type ChatApiMode = "shim" | "redis";

interface ChatContext {
  config: {
    chatApiMode: ChatApiMode;
  };
  worldApi: WorldApi;
}

export async function registerChatApi<C extends ChatContext>(
  loader: RegistryLoader<C>
): Promise<ChatApi> {
  const config = await loader.get("config");
  let api!: ChatApi;
  switch (config.chatApiMode) {
    case "shim":
      api = new RemoteChatApi(makeClient(zChatService, HostPort.forShim().rpc));
      break;
    case "redis":
      const [worldApi, redis] = await Promise.all([
        loader.get("worldApi"),
        connectToRedis("chat"),
      ]);
      api = new RedisChatApi(worldApi, redis);
      break;
  }
  if (process.env.NODE_ENV === "production") {
    try {
      await api.healthy();
    } catch (error: any) {
      log.warn("Could not ping Chat on start", { error });
    }
  }
  return api;
}
