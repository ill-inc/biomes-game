import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import { MemoryBikkieStorage } from "@/server/shared/bikkie/storage/memory";
import { RedisBikkieStorage } from "@/server/shared/bikkie/storage/redis";
import {
  RemoteBikkieStorage,
  zShimBikkieStorageService,
} from "@/server/shared/bikkie/storage/shim";
import { HostPort } from "@/server/shared/ports";
import { connectToRedis } from "@/server/shared/redis/connection";
import type { BaseServerConfig } from "@/server/shared/server_config";
import { makeClient } from "@/server/shared/zrpc/client";
import { addRetriesForUnavailable } from "@/server/shared/zrpc/retries";
import type { RegistryLoader } from "@/shared/registry";
import { assertNever } from "@/shared/util/type_helpers";

export type BiscuitMode = "memory" | "shim" | "redis2";

export async function registerBikkieStorage<
  C extends { config: BaseServerConfig }
>(loader: RegistryLoader<C>): Promise<BikkieStorage> {
  const config = await loader.get("config");
  switch (config.biscuitMode) {
    case "memory":
      return new MemoryBikkieStorage();
    case "shim":
      return new RemoteBikkieStorage(
        addRetriesForUnavailable(
          zShimBikkieStorageService,
          makeClient(zShimBikkieStorageService, HostPort.forShim().rpc)
        )
      );
    case "redis2":
      return new RedisBikkieStorage(await connectToRedis("bikkie"));
    default:
      assertNever(config.biscuitMode);
      throw new Error(`Unknown biscuit mode: ${config.biscuitMode}`);
  }
}
