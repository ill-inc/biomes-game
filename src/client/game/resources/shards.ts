import type {
  ClientResourceDeps,
  ClientResourcePaths,
} from "@/client/game/resources/types";
import type { ShardId } from "@/shared/ecs/gen/types";
import type { Ret } from "@/shared/resources/types";

export async function loadShardResources<K extends keyof ClientResourcePaths>(
  deps: ClientResourceDeps,
  resource: K,
  shardIds: ShardId[]
) {
  const ret = new Map<ShardId, Ret<ClientResourcePaths, K>>();
  for (const id of shardIds) {
    ret.set(id, await deps.get(resource, id));
  }
  return ret;
}

export async function createShardLoader<K extends keyof ClientResourcePaths>(
  deps: ClientResourceDeps,
  resource: K,
  shardIds: ShardId[]
) {
  const map = await loadShardResources<K>(deps, resource, shardIds);
  return (shard: ShardId) => map.get(shard);
}
