import type { LazyChange } from "@/server/shared/ecs/lazy";
import type { BiomesLuaRedis } from "@/server/shared/world/lua/api";
import type { RedisCompiledFilter } from "@/server/shared/world/lua/serde";
import {
  packForRedis,
  redisSinceDeltaToChange,
} from "@/server/shared/world/lua/serde";
import { biomesIdToRedisKey } from "@/server/shared/world/types";
import type { BiomesId } from "@/shared/ids";

export type RedisFilteredGetSinceMethods = {
  ecsFilteredGetSinceBuffer: (
    numKeys: number,
    ...keysThenFilter: (Buffer | number)[]
  ) => Promise<Buffer[]>;
};

export async function filteredGetSince(
  redis: BiomesLuaRedis,
  versionedIds: [BiomesId, number][],
  filter: RedisCompiledFilter
): Promise<LazyChange[]> {
  if (versionedIds.length === 0) {
    return [];
  }
  const keys = versionedIds.map(([id]) => biomesIdToRedisKey(id));
  const versions = versionedIds.map(([, version]) => version);
  const results = await redis.ecsFilteredGetSinceBuffer(
    keys.length,
    ...keys,
    ...versions,
    packForRedis(filter)
  );
  return results.map((value) => redisSinceDeltaToChange(value));
}
