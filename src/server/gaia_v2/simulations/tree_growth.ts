import type { UpdateResult } from "@/server/gaia_v2/simulations/api";
import { Simulation } from "@/server/gaia_v2/simulations/api";
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
import { SHARD_SHAPE, voxelShard } from "@/shared/game/shard";
import type { TerrainHelper } from "@/shared/game/terrain_helper";
import { add, distManhattan, equals } from "@/shared/math/linear";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { dfsVoxels } from "@/shared/util/dfs";
import { Sparse3 } from "@/shared/util/sparse";
import { iterBlock } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";

interface Timer {
  kind: "decay" | "grow";
  time: number;
}

export class TreeGrowthSimulation extends Simulation {
  private readonly timers = makeChunkIndex<Timer>();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly clock: Clock
  ) {
    super("tree_growth");
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

  *visitLogs(
    cache: TensorCache,
    origin: ReadonlyVec3,
    leaves: Iterable<readonly [ReadonlyVec3, TerrainID]>
  ) {
    const helper = terrainHelperFromTensorCache(this.voxeloo, cache);
    for (const [src, log] of leaves) {
      const worldPos = add(origin, src);

      // Check if the voxel exists or not.
      const exists = helper.getTerrainID(worldPos) == log;

      // DFS to see if this voxel is supported.
      let supported = false;
      dfsVoxels(worldPos, ([x, y, z]) => {
        if (
          equals([x, y, z], worldPos) ||
          this.isGrowableLogOfType(helper, [x, y, z], log)
        ) {
          if (this.isGrowableSoil(helper, [x, y - 1, z])) {
            supported = true;
            return "terminate";
          } else {
            return (
              distManhattan([x, y, z], worldPos) < CONFIG.gaiaV2GrowthTreeMaxDFS
            );
          }
        }
      });

      yield [src, exists, supported] as const;
    }
  }

  private isGrowableLogOfType(
    helper: TerrainHelper,
    pos: Vec3,
    log: TerrainID
  ) {
    return helper.getTerrainID(pos) == log && this.isGrowable(helper, pos);
  }

  private isGrowableSoil(helper: TerrainHelper, pos: ReadonlyVec3) {
    return (
      CONFIG.gaiaTreeGrowthSoils.includes(
        safeGetTerrainName(helper.getTerrainID(pos)) as string
      ) && this.isGrowable(helper, pos)
    );
  }

  private isGrowable(helper: TerrainHelper, pos: ReadonlyVec3) {
    return !helper.getPlacerID(pos) && !helper.getOccupancyID(pos);
  }

  async update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined> {
    const treeLogs = new Set(
      CONFIG.gaiaTreeGrowthLogs.map((name) => safeGetTerrainId(name))
    );

    const cache = new TensorCache(this.voxeloo, this.replica);
    try {
      const shardId = voxelShard(...shard.box.v0);
      const seed = cache.getSeed(shardId);
      if (!seed) {
        return;
      }

      const diff = cache.getDiff(shardId);
      const occupancy = cache.getDiff(shardId);

      // Identify all seed-tensor logs that might grow or decay.
      const logs = new Sparse3<TerrainID>(SHARD_SHAPE);
      for (const [pos, id] of iterBlock(this.voxeloo, seed)) {
        if (treeLogs.has(id as TerrainID)) {
          if (!diff?.get(...pos) && !occupancy?.get(...pos)) {
            logs.set(pos, id as TerrainID);
          }
        }
      }

      // Clear out any timers that do not reflect a log
      const chunk = this.timers.get(shard.id);
      for (const [pos, _] of chunk) {
        if (!logs.has(pos)) {
          chunk.del(pos);
        }
      }

      // Process batch to update timers and apply growth or decay.
      const mutator = new TerrainMutator(this.voxeloo, shard);
      for (const [pos, exists, supported] of this.visitLogs(
        cache,
        shard.box.v0,
        logs
      )) {
        const timer = chunk.get(pos);
        if (!exists && supported) {
          if (timer && timer.kind === "grow") {
            if (this.clock.ready(timer.time)) {
              mutator.diff.del(...pos);
              mutator.placer.set(pos, 0);
              chunk.del(pos);
            }
          } else {
            chunk.set(pos, {
              kind: "grow",
              time: this.clock.delayedTime(
                CONFIG.gaiaV2GrowthTreeRestoreTimeMs,
                CONFIG.gaiaV2GrowthTreeTimerFuzz
              ),
            });
          }
        } else if (exists && !supported) {
          if (timer && timer.kind === "decay") {
            if (this.clock.ready(timer.time)) {
              mutator.diff.set(...pos, 0);
              chunk.del(pos);
            }
          } else {
            chunk.set(pos, {
              kind: "decay",
              time: this.clock.delayedTime(
                CONFIG.gaiaV2GrowthTreeDecayTimeMs,
                CONFIG.gaiaV2GrowthTreeTimerFuzz
              ),
            });
          }
        } else {
          chunk.del(pos);
        }
      }

      // Emit the changes and reschedule at the appropriate time.
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
          Array.from(chunk, ([, timer]) => timer.time)
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
