import { HostPort } from "@/server/shared/ports";
import type { ZrpcServer } from "@/server/shared/zrpc/server";
import type { WebSocketZrpcServerLike } from "@/server/shared/zrpc/websocket/api";
import { zInternalSyncService } from "@/server/sync/api";
import type { ClientTable } from "@/server/sync/client_table";
import type { SyncServerContext } from "@/server/sync/context";
import type { SyncService } from "@/server/sync/service";
import type { SyncIndex } from "@/server/sync/subscription/sync_index";
import { zSyncService } from "@/shared/api/sync";
import type { RegistryLoader } from "@/shared/registry";
import { fireAndForget } from "@/shared/util/async";

export class SyncServer {
  constructor(
    private readonly syncIndex: SyncIndex,
    private readonly syncService: SyncService,
    private readonly wsRpcServer: WebSocketZrpcServerLike,
    private readonly rpcServer: ZrpcServer,
    private readonly clientTable: ClientTable
  ) {
    CONFIG_EVENTS.on("changed", () => {
      if (CONFIG.disableGame) {
        fireAndForget(this.wsRpcServer.forceReloadClients());
      }
    });
  }

  async start() {
    await this.syncIndex.start();
    this.clientTable.start();
    this.wsRpcServer.install(zSyncService, this.syncService);
    this.rpcServer.install(zInternalSyncService, this.syncService);
    await this.wsRpcServer.start(HostPort.forSync().port);
    // TODO: Cleanup hardcoding.
    // Is a large change now as things assume a service can only have a singular
    // port, sync actually has two.
    await this.rpcServer.start(3004);
  }

  async dump() {
    return this.clientTable.dump();
  }

  get ready() {
    return this.wsRpcServer.ready;
  }

  async lameDuck() {
    await this.wsRpcServer.lameDuck();
  }

  async stop() {
    await this.wsRpcServer.stop();
    await Promise.all([
      this.rpcServer.stop(),
      this.syncIndex.stop(),
      this.clientTable.stop(),
      this.syncService.stop(),
    ]);
  }
}

export async function registerSyncServer<C extends SyncServerContext>(
  loader: RegistryLoader<C>
) {
  return new SyncServer(
    ...(await Promise.all([
      loader.get("syncIndex"),
      loader.get("syncService"),
      loader.get("wsRpcServer"),
      loader.get("rpcServer"),
      loader.get("clients"),
    ]))
  );
}
