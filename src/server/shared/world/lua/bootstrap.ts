import type { LazyChange, LazyCreate } from "@/server/shared/ecs/lazy";
import type { BiomesLuaRedis } from "@/server/shared/world/lua/api";
import type { RedisCompiledFilter } from "@/server/shared/world/lua/serde";
import {
  deserializeRedisEntityState,
  packForRedis,
} from "@/server/shared/world/lua/serde";
import { redisKeyToBiomesId } from "@/server/shared/world/types";
import type { Delete } from "@/shared/ecs/change";

export type RedisBootstrapMethods = {
  ecsBootstrapBuffer: (
    numKeys: 0,
    cursor: Buffer,
    request: Buffer
  ) => Promise<[newCursor: Buffer, states: [id: Buffer, state: Buffer][]]>;
};

export type BootstrapCursor = Buffer & { readonly "": unique symbol };

export const INITIAL_BOOTSTRAP_CURSOR = Buffer.from("0") as BootstrapCursor;

function bootstrapStatesToChanges(states: [Buffer, Buffer][]): LazyChange[] {
  return states.map(([encodedId, state]) => {
    const id = redisKeyToBiomesId(encodedId);
    const [tick, entity] = deserializeRedisEntityState(id, state);
    if (entity) {
      return <LazyCreate>{
        kind: "create",
        tick,
        entity,
      };
    } else {
      return <Delete>{
        kind: "delete",
        tick,
        id,
      };
    }
  });
}

export async function bootstrap(
  redis: BiomesLuaRedis,
  cursor: BootstrapCursor,
  count: number,
  filter: RedisCompiledFilter
): Promise<[nextCursor: BootstrapCursor, changes: LazyChange[]]> {
  const [nextCursor, states] = await redis.ecsBootstrapBuffer(
    0,
    cursor,
    packForRedis({
      count,
      filter,
    })
  );

  return [nextCursor as BootstrapCursor, bootstrapStatesToChanges(states)];
}
