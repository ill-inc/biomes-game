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
import { safeGetTerrainId, type TerrainID } from "@/shared/asset_defs/terrain";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_SHAPE, voxelShard } from "@/shared/game/shard";
import type { TerrainHelper } from "@/shared/game/terrain_helper";
import { add, distManhattan, equals } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { dfsVoxels } from "@/shared/util/dfs";
import { Sparse3 } from "@/shared/util/sparse";
import { iterBlock } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";

interface Timer {
  kind: "decay" | "grow";
  time: number;
}

export class LeafGrowthSimulation extends Simulation {
  private readonly timers = makeChunkIndex<Timer>();
  private readonly leafRoots = new Map<TerrainID, TerrainID>();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly clock: Clock
  ) {
    super("leaf_growth");
    this.refreshConfig();
    CONFIG_EVENTS.on("changed", () => this.refreshConfig());
  }

  private refreshConfig() {
    this.leafRoots.clear();
    for (const [leaf, root] of CONFIG.gaiaLeafGrowthRoots) {
      const [leafId, rootId] = [safeGetTerrainId(leaf), safeGetTerrainId(root)];
      if (leafId === undefined || rootId === undefined) {
        continue;
      }
      this.leafRoots.set(leafId, rootId);
    }
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

  *visitLeaves(
    cache: TensorCache,
    origin: ReadonlyVec3,
    leaves: Iterable<readonly [ReadonlyVec3, [TerrainID, TerrainID]]>
  ) {
    const helper = terrainHelperFromTensorCache(this.voxeloo, cache);
    for (const [src, [leaf, root]] of leaves) {
      const worldPos = add(origin, src);

      // Check if the voxel exists.
      const exists = helper.getTerrainID(worldPos) === leaf;

      // DFS to see if this voxel is supported.
      let supported = false;
      dfsVoxels(worldPos, (pos) => {
        if (equals(pos, worldPos)) {
          return true;
        } else if (this.isGrowable(helper, pos)) {
          const id = helper.getTerrainID(pos);
          if (id == root) {
            supported = true;
            return "terminate";
          } else if (id === leaf) {
            return distManhattan(pos, worldPos) < CONFIG.gaiaV2GrowthLeafMaxDFS;
          }
        }
      });

      yield [src, exists, supported] as const;
    }
  }

  private isGrowable(helper: TerrainHelper, pos: ReadonlyVec3) {
    return !helper.getPlacerID(pos) && !helper.getOccupancyID(pos);
  }

  async update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined> {
    const cache = new TensorCache(this.voxeloo, this.replica);
    try {
      const shardId = voxelShard(...shard.box.v0);
      const seed = cache.getSeed(shardId);
      if (!seed) {
        return;
      }

      const diff = cache.getDiff(shardId);
      const occupancy = cache.getOccupancy(shardId);

      // Identify all seed-tensor leaves that might grow or decay.
      const leaves = new Sparse3<[TerrainID, TerrainID]>(SHARD_SHAPE);
      for (const [pos, id] of iterBlock(this.voxeloo, seed)) {
        const root = this.leafRoots.get(id as TerrainID);
        if (root) {
          if (!diff?.get(...pos) && !occupancy?.get(...pos)) {
            leaves.set(pos, [id as TerrainID, root]);
          }
        }
      }

      // Clear out any timers that do not reflect a leaf.
      const chunk = this.timers.get(shard.id);
      for (const [pos, _] of chunk) {
        if (!leaves.has(pos)) {
          chunk.del(pos);
        }
      }

      // Process batch to update timers and apply growth or decay.
      const mutator = new TerrainMutator(this.voxeloo, shard);
      for (const [pos, exists, supported] of this.visitLeaves(
        cache,
        shard.box.v0,
        leaves
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
                CONFIG.gaiaV2GrowthLeafRestoreTimeMs,
                CONFIG.gaiaV2GrowthLeafTimerFuzz
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
                CONFIG.gaiaV2GrowthLeafDecayTimeMs,
                CONFIG.gaiaV2GrowthLeafTimerFuzz
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
