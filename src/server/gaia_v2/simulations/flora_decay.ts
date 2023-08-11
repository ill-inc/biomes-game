import type { UpdateResult } from "@/server/gaia_v2/simulations/api";
import { Simulation } from "@/server/gaia_v2/simulations/api";
import {
  shardAndNeighborsOfDirs,
  terrainWasModified,
} from "@/server/gaia_v2/simulations/utils";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import {
  TensorCache,
  terrainHelperFromTensorCache,
} from "@/server/gaia_v2/terrain/cache";
import { TerrainMutator } from "@/server/gaia_v2/terrain/mutator";
import { safeGetTerrainId } from "@/shared/asset_defs/terrain";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import { isBlockId, isGlassId } from "@/shared/game/ids";
import type { ShardId } from "@/shared/game/shard";
import { voxelShard } from "@/shared/game/shard";
import type { TerrainHelper } from "@/shared/game/terrain_helper";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { VoxelooModule } from "@/shared/wasm/types";

export class FloraDecaySimulation extends Simulation {
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica
  ) {
    super("flora_decay");
  }

  invalidate(change: Change): ShardId[] {
    // TODO: Add util helper class to handle this recurring invalidation pattern.
    if (terrainWasModified(change)) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "box")) {
        return shardAndNeighborsOfDirs(entity.box.v0, [0, 1, 0]);
      }
    }
    return [];
  }

  private isDecayable(helper: TerrainHelper, pos: ReadonlyVec3) {
    return helper.getTerrainID(pos) && !helper.getOccupancyID(pos);
  }

  private shouldDecay(helper: TerrainHelper, [x, y, z]: ReadonlyVec3) {
    const base = helper.getTerrainID([x, y - 1, z]);
    return (
      this.isDecayable(helper, [x, y, z]) &&
      !(isBlockId(base) || isGlassId(base))
    );
  }

  async update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined> {
    const cache = new TensorCache(this.voxeloo, this.replica);
    try {
      const terrain = cache.getTerrain(voxelShard(...shard.box.v0));
      if (!terrain) {
        return;
      }

      const decayingFlora = new Set(
        CONFIG.gaiaFloraDecayFlora.map((x) => safeGetTerrainId(x))
      );

      const mutator = new TerrainMutator(this.voxeloo, shard);
      const helper = terrainHelperFromTensorCache(this.voxeloo, cache);
      for (const [pos, val] of terrain) {
        if (decayingFlora.has(val)) {
          if (this.shouldDecay(helper, add(shard.box.v0, pos))) {
            if (!mutator.seed.get(...pos)) {
              mutator.diff.del(...pos);
            } else {
              mutator.diff.set(...pos, 0);
            }
            mutator.placer.set(pos, 0);
          }
        }
      }

      const [changed, entity] = mutator.apply();
      if (changed) {
        return {
          changes: [
            {
              iffs: [[shard.id, version]],
              changes: [{ kind: "update", entity }],
            },
          ],
        };
      }
    } finally {
      cache.delete();
    }
  }
}
