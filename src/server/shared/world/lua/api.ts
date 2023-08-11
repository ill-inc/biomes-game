import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import type { RedisApplyMethods } from "@/server/shared/world/lua/apply";
import { apply } from "@/server/shared/world/lua/apply";
import type {
  BootstrapCursor,
  RedisBootstrapMethods,
} from "@/server/shared/world/lua/bootstrap";
import { bootstrap } from "@/server/shared/world/lua/bootstrap";
import type { RedisFilteredGetMethods } from "@/server/shared/world/lua/filtered_get";
import { filteredGet } from "@/server/shared/world/lua/filtered_get";
import type { RedisFilteredGetSinceMethods } from "@/server/shared/world/lua/filtered_get_since";
import { filteredGetSince } from "@/server/shared/world/lua/filtered_get_since";
import { getLuaScript } from "@/server/shared/world/lua/loader";
import type { RedisCompiledFilter } from "@/server/shared/world/lua/serde";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import type { BiomesId } from "@/shared/ids";

export type BiomesLuaRedis = BiomesRedisConnection &
  RedisApplyMethods &
  RedisBootstrapMethods &
  RedisFilteredGetMethods &
  RedisFilteredGetSinceMethods & {
    ecs: {
      apply(
        changesToApply: ChangeToApply[]
      ): Promise<[outcomes: ApplyStatus[], changes: LazyChange[]]>;
      bootstrap(
        cursor: BootstrapCursor,
        count: number,
        filter: RedisCompiledFilter
      ): Promise<[nextCursor: BootstrapCursor, changes: LazyChange[]]>;
      filteredGet(
        ids: BiomesId[],
        filter: RedisCompiledFilter
      ): Promise<[tick: number, entity: LazyEntity | undefined][]>;
      filteredGetSince(
        versionedIds: [BiomesId, number][],
        filter: RedisCompiledFilter
      ): Promise<LazyChange[]>;
    };
  };

export async function loadLuaScript(
  redis: BiomesRedisConnection,
  commandName: string,
  scriptName: string
) {
  redis.defineCommand(commandName, { lua: await getLuaScript(scriptName) });
}

const luaScriptsLoadedTag = Symbol.for("biomesLuaScriptsLoaded");

export function hasLoadedLua(
  redis: BiomesRedisConnection & { [luaScriptsLoadedTag]?: boolean }
): redis is BiomesLuaRedis {
  return !!redis[luaScriptsLoadedTag];
}

export async function loadAllLuaScripts(
  redis: BiomesRedisConnection & { [luaScriptsLoadedTag]?: boolean }
): Promise<BiomesLuaRedis> {
  if (hasLoadedLua(redis)) {
    return redis;
  }
  await Promise.all([
    loadLuaScript(redis, "ecsApply", "apply.lua"),
    loadLuaScript(redis, "ecsBootstrap", "bootstrap.lua"),
    loadLuaScript(redis, "ecsFilteredGet", "filtered_get.lua"),
    loadLuaScript(redis, "ecsFilteredGetSince", "filtered_get_since.lua"),
  ]);
  redis[luaScriptsLoadedTag] = true;
  const result = redis as BiomesLuaRedis;
  result.ecs = {
    apply: async (changesToApply) => apply(result, changesToApply),
    bootstrap: async (...args) => bootstrap(result, ...args),
    filteredGet: async (ids, filter) => filteredGet(result, ids, filter),
    filteredGetSince: async (versionedIds, filter) =>
      filteredGetSince(result, versionedIds, filter),
  };
  return result;
}
