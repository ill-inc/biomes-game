import {
  connectToRedis,
  connectToRedisWithLua,
} from "@/server/shared/redis/connection";
import type { WorldApi } from "@/server/shared/world/api";
import { HfcWorldApi } from "@/server/shared/world/hfc/hfc";
import { HybridWorldApi } from "@/server/shared/world/hfc/hybrid";
import { RedisWorld } from "@/server/shared/world/redis";
import { ShimWorldApi } from "@/server/shared/world/shim/api";
import { log } from "@/shared/logging";
import { RegistryLoader } from "@/shared/registry";
import { ok } from "assert";

export type WorldApiMode = "shim" | "redis" | "hfc-hybrid";

export function registerWorldApi<
  C extends {
    config: {
      worldApiMode: WorldApiMode;
    };
  }
>({
  signal,
}: {
  signal?: AbortSignal;
}): (loader: RegistryLoader<C>) => Promise<WorldApi> {
  ok(
    !(signal instanceof RegistryLoader),
    "Make sure to pass config to registerWorldApi"
  );
  return async (loader) => {
    const config = await loader.get("config");
    let client: WorldApi =
      config.worldApiMode !== "shim"
        ? new RedisWorld(await connectToRedisWithLua("ecs"))
        : new ShimWorldApi();
    if (config.worldApiMode === "hfc-hybrid") {
      client = new HybridWorldApi(
        client,
        new HfcWorldApi(await connectToRedis("ecs-hfc"))
      );
    }
    if (!CONFIG.disableGame) {
      if (!(await client.waitForHealthy(Infinity, signal))) {
        log.warn("World is not healthy on startup");
        if (!CONFIG.disableGame && process.env.NODE_ENV === "production") {
          throw new Error("World is not healthy on startup!");
        }
      }
    }
    return client;
  };
}
