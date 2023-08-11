import type { AskService } from "@/server/ask/api";
import { registerAskService } from "@/server/ask/service";
import type { AskReplica } from "@/server/ask/table";
import { registerAskReplica } from "@/server/ask/table";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { runServer } from "@/server/shared/main";
import { HostPort } from "@/server/shared/ports";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import type { ZrpcServer } from "@/server/shared/zrpc/server";
import { registerRpcServer } from "@/server/shared/zrpc/server";
import { RegistryBuilder } from "@/shared/registry";

export interface AskServerContext extends SharedServerContext {
  worldApi: WorldApi;
  replica: AskReplica;
  askService: AskService;
  rpcServer: ZrpcServer;
}

void runServer(
  "ask",
  (signal) =>
    new RegistryBuilder<AskServerContext>()
      .install(sharedServerContext)
      .bind("replica", registerAskReplica)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("askService", registerAskService)
      .bind("rpcServer", () => registerRpcServer())
      .build(),
  async (context) => {
    await Promise.all([
      context.replica.start(),
      context.rpcServer.start(HostPort.rpcPort),
    ]);
    return {
      readyHook: async () => context.worldApi.healthy(),
    };
  }
);
