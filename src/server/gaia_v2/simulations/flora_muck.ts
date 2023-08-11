import { PositionSampler } from "@/cayley/graphics/utils";
import type { UpdateResult } from "@/server/gaia_v2/simulations/api";
import { Simulation } from "@/server/gaia_v2/simulations/api";
import { terrainWasModified } from "@/server/gaia_v2/simulations/utils";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import { TensorCache } from "@/server/gaia_v2/terrain/cache";
import { TerrainMutator } from "@/server/gaia_v2/terrain/mutator";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { safeGetTerrainId } from "@/shared/asset_defs/terrain";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import { GaiaId, MuckId } from "@/shared/ecs/ids";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_SHAPE, voxelShard } from "@/shared/game/shard";
import { isMucky } from "@/shared/game/terrain_helper";
import type { Vec3 } from "@/shared/math/types";
import { Sparse3 } from "@/shared/util/sparse";
import type { VoxelooModule } from "@/shared/wasm/types";

interface Entry {
  id: TerrainID;
  muckyness: number;
}

export class FloraMuckSimulation extends Simulation {
  private readonly floraMuckMap = new Map<TerrainID, TerrainID>();
  private readonly cleanFlora = new Set<TerrainID>();
  private readonly muckyFlora = new Set<TerrainID>();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica
  ) {
    super("flora_muck");
    this.refreshConfig();
    CONFIG_EVENTS.on("changed", () => this.refreshConfig());
  }

  private refreshConfig() {
    this.floraMuckMap.clear();
    this.cleanFlora.clear();
    this.muckyFlora.clear();

    for (const [clean, mucky] of CONFIG.gaiaFloraMuckFlora) {
      const [cleanId, muckyId] = [
        safeGetTerrainId(clean),
        safeGetTerrainId(mucky),
      ];
      if (cleanId === undefined || muckyId === undefined) {
        continue;
      }
      this.floraMuckMap.set(cleanId, muckyId);
      this.cleanFlora.add(cleanId);
      this.muckyFlora.add(muckyId);
    }
  }

  invalidate(change: Change): ShardId[] {
    // Schedule an update over this shard if its muck tensor was modified.
    if (
      (change.kind !== "delete" && change.entity.shard_muck) ||
      terrainWasModified(change)
    ) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "box")) {
        return [voxelShard(...entity.box.v0)];
      }
    }
    return [];
  }

  private getSwapables(cache: TensorCache, shardId: ShardId) {
    const ret = new Sparse3<Entry>(SHARD_SHAPE);

    const terrain = cache.getTerrain(shardId);
    if (terrain) {
      const muck = cache.getMuck(shardId);
      for (const [pos, id] of terrain) {
        if (this.cleanFlora.has(id) || this.muckyFlora.has(id)) {
          ret.set(pos, { id, muckyness: muck?.get(...pos) ?? 0 });
        }
      }
    }

    return ret;
  }

  shouldMuck([x, y, z]: Vec3, entry: Entry) {
    const floraIsClean = this.cleanFlora.has(entry.id);
    return floraIsClean && isMucky([x, y - 1, z], entry.muckyness);
  }

  shouldUnmuck([x, y, z]: Vec3, entry: Entry) {
    const floraIsMucky = this.muckyFlora.has(entry.id);
    return floraIsMucky && !isMucky([x, y - 1, z], entry.muckyness);
  }

  async update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined> {
    const cache = new TensorCache(this.voxeloo, this.replica);
    try {
      const sampler = new PositionSampler(Array.from(this.cleanFlora));

      // Get the set of muck-swapable flora for this chunk.
      const swapables = this.getSwapables(cache, voxelShard(...shard.box.v0));

      // Identify flora to swap based on muck level.
      const mutator = new TerrainMutator(this.voxeloo, shard);
      for (const [pos, entry] of swapables) {
        if (this.shouldUnmuck(pos, entry)) {
          if (this.cleanFlora.has(mutator.seed.get(...pos))) {
            mutator.diff.del(...pos);
            if (mutator.placer.get(pos) == MuckId) {
              mutator.placer.set(pos, 0);
            }
          } else {
            mutator.diff.set(...pos, sampler.get(pos));
            if (mutator.placer.get(pos) == MuckId) {
              mutator.placer.set(pos, GaiaId);
            }
          }
        } else if (this.shouldMuck(pos, entry)) {
          mutator.diff.set(...pos, this.floraMuckMap.get(entry.id)!);
          mutator.placer.set(pos, MuckId);
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
