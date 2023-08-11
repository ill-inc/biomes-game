import type { AskApi } from "@/server/ask/api";
import type { EventHandlerMap } from "@/server/logic/events/all";
import type { LogicApi } from "@/server/shared/api/logic";
import type { ChatApi } from "@/server/shared/chat/api";
import type { SharedServerContext } from "@/server/shared/context";
import type { DiscordBot } from "@/server/shared/discord";
import type { Firehose } from "@/server/shared/firehose/api";
import type { ServerMods } from "@/server/shared/minigames/server_mods";
import type { WorldApi } from "@/server/shared/world/api";
import type { ZrpcServer } from "@/server/shared/zrpc/server";
import type { WebSocketZrpcServerLike } from "@/server/shared/zrpc/websocket/api";
import type { ClientTable } from "@/server/sync/client_table";
import type { CrossClientEventBatcher } from "@/server/sync/events/cross_client";
import type { SyncServer } from "@/server/sync/server";
import type { SyncService } from "@/server/sync/service";
import type { SyncIndex } from "@/server/sync/subscription/sync_index";
import type { SessionStore } from "@/server/web/db/sessions";
import type { ServerCache } from "@/server/web/server_cache";

export interface SyncServerContext extends SharedServerContext {
  askApi: AskApi;
  chatApi: ChatApi;
  clients: ClientTable;
  crossClientEventBatcher: CrossClientEventBatcher;
  discord: DiscordBot;
  eventHandlerMap: EventHandlerMap;
  firehose: Firehose;
  logicApi: LogicApi;
  rpcServer: ZrpcServer;
  serverMods: ServerMods;
  serverCache: ServerCache;
  sessionStore: SessionStore;
  syncIndex: SyncIndex;
  syncServer: SyncServer;
  syncService: SyncService;
  worldApi: WorldApi;
  wsRpcServer: WebSocketZrpcServerLike;
}
