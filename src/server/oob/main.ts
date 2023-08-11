import type { OobServer } from "@/server/oob/oob";
import { registerOobServer } from "@/server/oob/oob";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { registerDummyHttp } from "@/server/shared/http";
import { runServer } from "@/server/shared/main";
import { HostPort, listenWithDevFallback } from "@/server/shared/ports";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import type { SessionStore } from "@/server/web/db/sessions";
import { registerSessionStore } from "@/server/web/db/sessions";
import type { ServerCache } from "@/server/web/server_cache";
import { registerCacheClient } from "@/server/web/server_cache";
import { RegistryBuilder } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import type { Server as HTTPServer } from "http";

export interface OobServerContext extends SharedServerContext {
  http: HTTPServer;
  oobServer: OobServer;
  serverCache: ServerCache;
  sessionStore: SessionStore;
  worldApi: WorldApi;
}

void runServer(
  "oob",
  (signal) =>
    new RegistryBuilder<OobServerContext>()
      .install(sharedServerContext)
      .bind("http", async () => registerDummyHttp())
      .bind("oobServer", registerOobServer)
      .bind("serverCache", registerCacheClient)
      .bind("sessionStore", registerSessionStore)
      .bind("worldApi", registerWorldApi({ signal }))
      .build(),
  async (context) => {
    const port = HostPort.forOob().port;
    listenWithDevFallback("Oob", context.http, port);
    return {
      readyHook: async () => context.worldApi.healthy(),
      shutdownHook: async () => {
        await sleep(CONFIG.webServerLameDuckMs);
        context.http.close();
        context.http.closeAllConnections();
      },
    };
  }
);
