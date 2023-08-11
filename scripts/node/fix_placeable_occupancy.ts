import {
  migrateTerrain,
  scanEntities,
} from "@/../scripts/node/abstract_migrate_script";
import { involvedShards } from "@/server/logic/utils/groups";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { aabbToBox } from "@/shared/game/group";
import {
  getAabbForPlaceable,
  getAabbForPlaceableEntity,
} from "@/shared/game/placeables";
import { ShardId, blockPos } from "@/shared/game/shard";
import { ReadonlyTerrain, Terrain } from "@/shared/game/terrain/terrain";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { aabbIterator, add, ceil, floor, sub } from "@/shared/math/linear";
import { DefaultMap } from "@/shared/util/collections";

const [backupFile] = process.argv.slice(2);

async function main() {
  // Scan all placeables and find which shards they are in.
  const shardToPlaceables = new DefaultMap<ShardId, ReadonlyEntity[]>(() => []);
  await scanEntities(backupFile, (placeable) => {
    if (
      placeable.placeable_component &&
      placeable.position &&
      !placeable.iced
    ) {
      const aabb = getAabbForPlaceable(
        placeable.placeable_component.item_id,
        placeable.position.v,
        placeable.orientation?.v
      );
      if (!aabb) {
        return;
      }
      const shards = involvedShards(aabbToBox(aabb));
      for (const shard of shards) {
        shardToPlaceables.get(shard).push(placeable);
      }
    }
  });

  // For each shard, check if any placeables are missing occupancy or intersecting terrain.
  const badPlaceables = new Set<BiomesId>();
  const applyShardFix = (
    terrain: Terrain | ReadonlyTerrain,
    shardId: ShardId
  ): boolean => {
    const placeables = shardToPlaceables.peek(shardId);
    if (!placeables?.length) {
      return false;
    }

    let changes = false;
    for (const placeable of placeables) {
      const aabb = getAabbForPlaceableEntity(placeable);
      if (!aabb) {
        continue;
      }
      const epsilon = [1e-9, 1e-9, 1e-9] as const;
      for (const worldPos of aabbIterator([
        floor(add(aabb[0], epsilon)),
        ceil(sub(aabb[1], epsilon)),
      ])) {
        const shardPos = blockPos(...worldPos);
        if (
          terrain.occupancy.get(...shardPos) !== placeable.id || // occupancy is not set; or
          !!terrain.terrainAt(shardPos) // there is a conflicting voxel
        ) {
          changes = true;
          if (terrain instanceof Terrain) {
            terrain.clearTerrainAt(shardPos, undefined);
            terrain.setTerrainAt(
              shardPos,
              {
                occupancyId: placeable.id,
              },
              undefined
            );
          } else {
            badPlaceables.add(placeable.id);
          }
        }
      }
    }
    return changes;
  };

  await migrateTerrain(
    backupFile,
    applyShardFix,
    (terrain, shardId) => {
      applyShardFix(terrain, shardId);
    },
    () => {
      log.info(`Fixing ${badPlaceables.size} placeables...`);
    }
  );
}

main();
