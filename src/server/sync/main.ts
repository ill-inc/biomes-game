import { registerAskApi } from "@/server/ask/api";
import { registerEventHandlerMap } from "@/server/logic/events/all";
import { registerLogicApi } from "@/server/shared/api/logic";
import { registerChatApi } from "@/server/shared/chat/register";
import { sharedServerContext } from "@/server/shared/context";
import { registerDiscordBot } from "@/server/shared/discord";
import { registerFirehose } from "@/server/shared/firehose/register";
import { runServer } from "@/server/shared/main";
import { registerServerMods } from "@/server/shared/minigames/server_bootstrap";
import { registerWorldApi } from "@/server/shared/world/register";
import { registerRpcServer } from "@/server/shared/zrpc/server";
import type { WebSocketZrpcServerLike } from "@/server/shared/zrpc/websocket/api";
import { WebSocketZrpcServer } from "@/server/shared/zrpc/websocket/server";
import { registerClients } from "@/server/sync/client_table";
import type { SyncServerContext } from "@/server/sync/context";
import { registerCrossClientEventBatcher } from "@/server/sync/events/cross_client";
import { registerSyncServer } from "@/server/sync/server";
import { SyncService } from "@/server/sync/service";
import { registerSyncIndex } from "@/server/sync/subscription/sync_index";
import { registerSessionStore } from "@/server/web/db/sessions";
import { registerCacheClient } from "@/server/web/server_cache";
import type { RegistryLoader } from "@/shared/registry";
import { RegistryBuilder } from "@/shared/registry";
import { sleep } from "@/shared/util/async";

async function registerWsRpcServer<C extends SyncServerContext>(
  loader: RegistryLoader<C>
): Promise<WebSocketZrpcServerLike> {
  return new WebSocketZrpcServer(
    await loader.get("sessionStore"),
    ["/sync", "/beta-sync", "/ro-sync"],
    {
      maxConnections: CONFIG.syncMaxClients,
      maxInflightRequestsPerClient: CONFIG.syncMaxInflightRequestsPerClient,
      permitAnonymous: Boolean(
        process.env.NODE_ENV !== "production" || process.env.RO_SYNC
      ),
    }
  );
}

export async function registerSyncService<C extends SyncServerContext>(
  loader: RegistryLoader<C>
) {
  return new SyncService(
    ...(await Promise.all([
      loader.get("db"),
      loader.get("clients"),
      loader.get("syncIndex"),
      loader.get("worldApi"),
      loader.get("askApi"),
      loader.get("chatApi"),
      loader.get("firehose"),
    ]))
  );
}

void runServer(
  "sync",
  (signal) =>
    new RegistryBuilder<SyncServerContext>()
      .install(sharedServerContext)
      .bind("askApi", registerAskApi)
      .bind("chatApi", registerChatApi)
      .bind("clients", registerClients)
      .bind("crossClientEventBatcher", registerCrossClientEventBatcher)
      .bind("eventHandlerMap", registerEventHandlerMap)
      .bind("firehose", registerFirehose)
      .bind("logicApi", registerLogicApi)
      .bind("serverMods", registerServerMods)
      .bind("serverCache", registerCacheClient)
      .bind("sessionStore", registerSessionStore)
      .bind("syncIndex", registerSyncIndex)
      .bind("syncServer", registerSyncServer)
      .bind("syncService", registerSyncService)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("wsRpcServer", registerWsRpcServer)
      .bind("rpcServer", () => registerRpcServer())
      .bind("discord", registerDiscordBot)
      .build(),
  async (context) => {
    await context.syncServer.start();
    return {
      readyHook: async () =>
        context.syncServer.ready && (await context.worldApi.healthy()),
      shutdownHook: async () => {
        await context.syncServer.lameDuck();
        await sleep(CONFIG.webServerLameDuckMs);
        await context.syncServer.stop();
      },
      dumpHook: async () => {
        return {
          sync: await context.syncServer.dump(),
        };
      },
    };
  }
);
