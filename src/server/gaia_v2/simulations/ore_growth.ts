import { positionHash } from "@/cayley/graphics/utils";
import type { UpdateResult } from "@/server/gaia_v2/simulations/api";
import { Simulation } from "@/server/gaia_v2/simulations/api";
import {
  makeChunkIndex,
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
import { safeGetTerrainId } from "@/shared/asset_defs/terrain";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import type { ShardId } from "@/shared/game/shard";
import { shardEncode, voxelShard, voxelToShardPos } from "@/shared/game/shard";
import type { TerrainHelper } from "@/shared/game/terrain_helper";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { dfsVoxels } from "@/shared/util/dfs";
import { iterBlock } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";

const SAMPLE_QUANTIZATION = 32;

export class OreGrowthSimulation extends Simulation {
  private readonly timers = makeChunkIndex<number>();
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly clock: Clock
  ) {
    super("ore_growth");
  }

  invalidate(change: Change): ShardId[] {
    if (terrainWasModified(change)) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "box")) {
        return [shardEncode(...voxelToShardPos(...entity.box.v0))];
      }
    }
    return [];
  }

  private isConnectedToAir(helper: TerrainHelper, pos: ReadonlyVec3) {
    let ret = false;
    const sourceOre = helper.getSeedID(pos);
    dfsVoxels(pos, ([x, y, z]) => {
      const id = helper.getSeedID([x, y, z]);
      if (id === 0) {
        ret = true;
        return "terminate";
      } else {
        return id === sourceOre;
      }
    });
    return ret;
  }

  private isSupported(helper: TerrainHelper, [x, y, z]: ReadonlyVec3) {
    let count = 0;
    for (const pos of [
      [x - 1, y, z],
      [x + 1, y, z],
      [x, y - 1, z],
      [x, y + 1, z],
      [x, y, z - 1],
      [x, y, z + 1],
    ] as ReadonlyVec3[]) {
      if (helper.getTerrainID(pos) > 0) {
        count += 1;
      }
    }
    return count >= 2;
  }

  private shouldGrow(helper: TerrainHelper, pos: ReadonlyVec3) {
    return (
      !helper.getTerrainID(pos) &&
      !helper.getOccupancyID(pos) &&
      this.isSupported(helper, pos) &&
      this.isConnectedToAir(helper, pos)
    );
  }

  private chooseOre(
    oresTable: Map<TerrainID, number>,
    seedID: TerrainID,
    [x, y, z]: ReadonlyVec3
  ) {
    const variation = seedID + Math.floor(this.clock.now() / 86400 / 1000);
    const hash = positionHash([
      Math.floor(x / SAMPLE_QUANTIZATION) + variation,
      Math.floor(y / SAMPLE_QUANTIZATION) + variation,
      Math.floor(z / SAMPLE_QUANTIZATION) + variation,
    ]);
    let cdf = hash / 0xffffffff;
    for (const [ore, prob] of oresTable) {
      if (cdf < prob) {
        return ore;
      } else {
        cdf -= prob;
      }
    }
    return oresTable.keys().next().value;
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

      const oresTable = new Map<TerrainID, number>();
      for (const [name, prob] of CONFIG.gaiaOreGrowthOres) {
        const id = safeGetTerrainId(name);
        if (id) {
          oresTable.set(id, prob);
        }
      }

      const chunk = this.timers.get(shard.id);
      const mutator = new TerrainMutator(this.voxeloo, shard);
      const helper = terrainHelperFromTensorCache(this.voxeloo, cache);
      for (const [pos, id] of iterBlock(this.voxeloo, seed)) {
        if (oresTable.has(id as TerrainID)) {
          if (this.shouldGrow(helper, add(shard.box.v0, pos))) {
            const timer = chunk.get(pos);
            if (timer) {
              if (this.clock.ready(timer)) {
                const ore = this.chooseOre(oresTable, id as TerrainID, pos);
                mutator.diff.set(...pos, ore);
                mutator.placer.set(pos, 0);
                chunk.del(pos);
              }
            } else {
              chunk.set(
                pos,
                this.clock.delayedTime(
                  CONFIG.gaiaV2GrowthOresRestoreTimeMs,
                  CONFIG.gaiaV2GrowthOresTimerFuzz
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
