import type { ShardManager } from "@/server/shared/shard_manager/api";
import type { BiomesId } from "@/shared/ids";

function randomHash(x: number) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

export function shouldManageEntity(
  shardManager: ShardManager,
  id: BiomesId
): boolean {
  const total = shardManager.total;
  if (!total) {
    return false;
  }
  return shardManager.held.has(Math.abs(randomHash(id)) % total);
}
