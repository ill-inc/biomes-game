import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { BiomesLuaRedis } from "@/server/shared/world/lua/api";
import type { RedisCompiledFilter } from "@/server/shared/world/lua/serde";
import {
  deserializeRedisEntityState,
  packForRedis,
} from "@/server/shared/world/lua/serde";
import { biomesIdToRedisKey } from "@/server/shared/world/types";
import type { BiomesId } from "@/shared/ids";

export type RedisFilteredGetMethods = {
  ecsFilteredGetBuffer: (
    numKeys: number,
    ...versionedKeysThenFilter: Buffer[]
  ) => Promise<Buffer[]>;
};

export async function filteredGet(
  redis: BiomesLuaRedis,
  ids: BiomesId[],
  filter: RedisCompiledFilter
): Promise<[number, LazyEntity | undefined][]> {
  const states = await redis.ecsFilteredGetBuffer(
    ids.length,
    ...ids.map((id) => biomesIdToRedisKey(id)),
    packForRedis(filter)
  );
  const output: [number, LazyEntity | undefined][] = [];
  ids.forEach((id, idx) => {
    output.push(deserializeRedisEntityState(id, states[idx]));
  });
  return output;
}
