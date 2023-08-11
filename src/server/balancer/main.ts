import { runServer } from "@/server/shared/main";
import { HostPort } from "@/server/shared/ports";
import type { BalancerService } from "@/server/shared/shard_manager/service";
import {
  registerBalancerService,
  zBalancerService,
} from "@/server/shared/shard_manager/service";
import type { ZrpcServer } from "@/server/shared/zrpc/server";
import { registerRpcServer } from "@/server/shared/zrpc/server";
import { RegistryBuilder } from "@/shared/registry";

//
// IMPORTANT NOTE!
// To ensure this server starts super-quickly, we avoid some standard dependencies
// that we don't need. This server in particular solely depends on Redis (or shim).
// And WILL NOT WAIT for Bikkie or Firestore, this is unlike most servers.
//
interface BackupServerContext {
  balancerService: BalancerService;
  rpcServer: ZrpcServer;
}

void runServer(
  "balancer",
  () =>
    new RegistryBuilder<BackupServerContext>()
      .bind("balancerService", registerBalancerService)
      .bind("rpcServer", () => registerRpcServer())
      .build(),
  async (context) => {
    context.rpcServer.install(zBalancerService, context.balancerService);
    await context.rpcServer.start(HostPort.rpcPort);
  }
);
