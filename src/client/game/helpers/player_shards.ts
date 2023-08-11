import type { ClientResources } from "@/client/game/resources/types";
import { SHARD_DIM, shardCenter, shardsForAABB } from "@/shared/game/shard";
import { containsAABB, growAABB } from "@/shared/math/linear";
import type { AABB } from "@/shared/math/types";

function nearbyAabbShards(
  resources: ClientResources,
  aabb: AABB | undefined,
  grow?: number
) {
  if (!aabb) {
    return [];
  }

  const metadata = resources.get("/ecs/metadata");
  if (grow) {
    aabb = growAABB(aabb, grow);
  }
  return Array.from(shardsForAABB(...aabb)).filter((shard) =>
    containsAABB([metadata.aabb.v0, metadata.aabb.v1], shardCenter(shard))
  );
}

function nearbyPlayerShards(resources: ClientResources, grow?: number) {
  const player = resources.get("/scene/local_player");
  return nearbyAabbShards(resources, player.player.aabb(), grow);
}

export function allAabbShardsLoaded(
  resources: ClientResources,
  aabb: AABB | undefined
) {
  let numShards = 0;
  for (const shard of nearbyAabbShards(resources, aabb)) {
    numShards += 1;
    if (!resources.get("/physics/boxes", shard)) {
      return false;
    }
  }
  return numShards > 0;
}

export function allPlayerShardsLoaded(resources: ClientResources) {
  const player = resources.get("/scene/local_player");
  return allAabbShardsLoaded(resources, player.player.aabb());
}

export function allPlayerShardsMeshed(resources: ClientResources) {
  let numShards = 0;
  for (const shard of nearbyPlayerShards(resources, SHARD_DIM)) {
    numShards += 1;
    if (!resources.get("/physics/boxes", shard)) {
      return false;
    }
    if (!resources.cached("/terrain/combined_mesh", shard)) {
      return false;
    }
  }
  return numShards > 0;
}

export async function triggerPlayerShardsMesh(resources: ClientResources) {
  await Promise.all(
    nearbyPlayerShards(resources, SHARD_DIM).map((shard) =>
      resources.get("/terrain/combined_mesh", shard)
    )
  );
}
