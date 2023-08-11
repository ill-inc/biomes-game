import type { UpdateResult } from "@/server/gaia_v2/simulations/api";
import { Simulation } from "@/server/gaia_v2/simulations/api";
import { makeChunkIndex } from "@/server/gaia_v2/simulations/utils";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import type { Clock } from "@/server/gaia_v2/util/clock";
import { terrainLifetime } from "@/shared/asset_defs/quirk_helpers";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { DeletableScope } from "@/shared/deletable";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import type { ShardId } from "@/shared/game/shard";
import { voxelShard } from "@/shared/game/shard";
import { loadDiff, loadSeed } from "@/shared/game/terrain";
import type { Sparse3 } from "@/shared/util/sparse";
import { saveBlockWrapper } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseBlock } from "@/shared/wasm/types/biomes";

interface Entry {
  id: TerrainID;
  decayAt: number;
}

export class LifetimeSimulation extends Simulation {
  private readonly map = makeChunkIndex<Entry>();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly clock: Clock
  ) {
    super("lifetime");
  }

  invalidate(change: Change): ShardId[] {
    // Schedule an update over this shard if its diff tensor was modified.
    if (change.kind !== "delete" && change.entity.shard_diff) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "box")) {
        return [voxelShard(...entity.box.v0)];
      }
    }
    return [];
  }

  private updateIndex(chunk: Sparse3<Entry>, diff: SparseBlock<"U32">) {
    // Update all active lifetime entries.
    diff.scan((x, y, z, id) => {
      const lifetime = terrainLifetime(id);
      if (lifetime) {
        const entry = chunk.get([x, y, z]);
        if (!entry || entry.id !== id) {
          chunk.set([x, y, z], {
            id,
            decayAt: this.clock.delayedTime(1000 * lifetime),
          });
        }
      }
    });

    // Remove entries that no longer exist in the diff.
    for (const [pos, entry] of chunk) {
      if (diff.get(...pos) !== entry.id) {
        chunk.del(pos);
      }
    }
  }

  async update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined> {
    const scope = new DeletableScope();
    try {
      const seed = scope.use(loadSeed(this.voxeloo, shard));
      if (!seed) {
        return;
      }

      const diff = scope.use(loadDiff(this.voxeloo, shard));
      if (!diff) {
        return;
      }

      const chunk = this.map.get(shard.id);

      // Make sure that the index is up-to-date for this shard.
      this.updateIndex(chunk, diff);

      // Identify the next voxel to decay.
      let changed = false;
      let minDelay = Infinity;
      for (const [pos, entry] of chunk) {
        const delay = this.clock.timeUntil(entry.decayAt);
        if (delay > 0) {
          minDelay = Math.min(minDelay, delay);
        } else if (seed.get(...pos)) {
          diff.set(...pos, 0);
          changed = true;
        } else {
          diff.del(...pos);
          changed = true;
        }
      }

      if (changed) {
        return {
          changes: [
            {
              iffs: [[shard.id, version]],
              changes: [
                {
                  kind: "update",
                  entity: {
                    id: shard.id,
                    shard_diff: saveBlockWrapper(this.voxeloo, diff),
                  },
                },
              ],
            },
          ],
        };
      } else if (minDelay != Infinity) {
        return {
          update: { kind: "requeue", afterDelayMs: minDelay },
        };
      }
    } finally {
      scope.delete();
    }
  }
}
