import {
  Simulation,
  type UpdateResult,
} from "@/server/gaia_v2/simulations/api";
import {
  makeChunkIndex,
  shardAndNeighborsOfDirs,
  terrainWasModified,
} from "@/server/gaia_v2/simulations/utils";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import {
  TensorCache,
  terrainHelperFromTensorCache,
} from "@/server/gaia_v2/terrain/cache";
import { TerrainMutator } from "@/server/gaia_v2/terrain/mutator";
import { minTimeUntil, type Clock } from "@/server/gaia_v2/util/clock";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import {
  safeGetTerrainId,
  safeGetTerrainName,
} from "@/shared/asset_defs/terrain";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import type { ShardId } from "@/shared/game/shard";
import { voxelShard } from "@/shared/game/shard";
import type { TerrainHelper } from "@/shared/game/terrain_helper";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { iterBlock } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";

export class FloraGrowthSimulation extends Simulation {
  private readonly timers = makeChunkIndex<number>();
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly clock: Clock
  ) {
    super("flora_growth");
  }

  invalidate(change: Change): ShardId[] {
    if (terrainWasModified(change)) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "box")) {
        return shardAndNeighborsOfDirs(entity.box.v0, [0, 1, 0]);
      }
    }
    return [];
  }

  private isGrowable(helper: TerrainHelper, pos: ReadonlyVec3) {
    return !helper.getTerrainID(pos) && !helper.getOccupancyID(pos);
  }

  private shouldGrow(helper: TerrainHelper, [x, y, z]: ReadonlyVec3) {
    return (
      this.isGrowable(helper, [x, y, z]) &&
      CONFIG.gaiaFloraGrowthSoil.includes(
        safeGetTerrainName(helper.getTerrainID([x, y - 1, z])) as string
      )
    );
  }

  async update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined> {
    const cache = new TensorCache(this.voxeloo, this.replica);
    try {
      const seed = cache.getSeed(voxelShard(...shard.box.v0));
      if (!seed) {
        return;
      }

      const growingFlora = new Set(
        CONFIG.gaiaFloraGrowthFlora.map((x) => safeGetTerrainId(x))
      );

      const chunk = this.timers.get(shard.id);
      const mutator = new TerrainMutator(this.voxeloo, shard);
      const helper = terrainHelperFromTensorCache(this.voxeloo, cache);
      for (const [pos, id] of iterBlock(this.voxeloo, seed)) {
        if (growingFlora.has(id as TerrainID)) {
          if (this.shouldGrow(helper, add(shard.box.v0, pos))) {
            const timer = chunk.get(pos);
            if (timer) {
              if (this.clock.ready(timer)) {
                mutator.diff.del(...pos);
                mutator.placer.set(pos, 0);
                chunk.del(pos);
              }
            } else {
              chunk.set(
                pos,
                this.clock.delayedTime(
                  CONFIG.gaiaV2GrowthFloraRestoreTimeMs,
                  CONFIG.gaiaV2GrowthFloraTimerFuzz
                )
              );
            }
          } else {
            chunk.del(pos);
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
      } else {
        const minDelayMs = minTimeUntil(
          this.clock,
          Array.from(chunk, ([_, time]) => time)
        );
        if (minDelayMs != Infinity) {
          return { update: { kind: "requeue", afterDelayMs: minDelayMs } };
        }
      }
    } finally {
      cache.delete();
    }
  }
}
