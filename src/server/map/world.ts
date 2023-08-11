import type { MapContext } from "@/server/map/context";
import type { MapReplica } from "@/server/map/table";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import { voxelShard } from "@/shared/game/shard";
import { containsAABB, unionAABB } from "@/shared/math/linear";
import type { AABB, ReadonlyAABB, ReadonlyVec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import assert from "assert";

export interface WorldHelper {
  getWorldBounds(): ReadonlyAABB;
  getTerrainShard(pos: ReadonlyVec3): ReadonlyEntity | undefined;
  contains(pos: ReadonlyVec3): boolean;
}

export class WorldHelperImpl implements WorldHelper {
  worldAABB?: AABB;

  constructor(private replica: MapReplica) {}

  getWorldBounds(): ReadonlyAABB {
    // TODO: Consider moving this to a resource.
    if (!this.worldAABB) {
      for (const entity of this.replica.table.scan(
        TerrainShardSelector.query.all()
      )) {
        const shardAABB: AABB = [[...entity.box.v0], [...entity.box.v1]];
        this.worldAABB = this.worldAABB
          ? unionAABB(this.worldAABB, shardAABB)
          : shardAABB;
      }
      assert.ok(this.worldAABB);
    }
    return this.worldAABB;
  }

  getTerrainShard(pos: ReadonlyVec3) {
    const entity = this.replica.table.get(
      TerrainShardSelector.query.key(voxelShard(...pos))
    );
    return entity;
  }

  contains(pos: ReadonlyVec3) {
    return containsAABB(this.getWorldBounds(), pos);
  }
}

export async function registerWorldHelper<C extends MapContext>(
  loader: RegistryLoader<C>
) {
  const replica = await loader.get("replica");
  return new WorldHelperImpl(replica);
}
export const MAP_WORLD_KEY = "alpha";
