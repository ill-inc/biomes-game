import { Simulation } from "@/server/gaia_v2/simulations/api";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import { changeFromWater } from "@/server/gaia_v2/terrain/emitter";
import type { Iff } from "@/shared/api/transaction";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import type { ShardId } from "@/shared/game/shard";
import { shardNeighbours, voxelShard } from "@/shared/game/shard";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaTerrainMapV2 } from "@/shared/wasm/types/gaia";

export class WaterSimulation extends Simulation {
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly map: GaiaTerrainMapV2
  ) {
    super("water");
  }

  invalidate(change: Change): ShardId[] {
    if (change.kind === "delete") {
      return [];
    } else if (
      !change.entity.shard_water &&
      !change.entity.shard_diff &&
      !change.entity.shard_seed
    ) {
      // No change to water or landscape, so no need to update.
      return [];
    }

    const entity = this.replica.table.get(change.entity.id);
    if (!Entity.has(entity, "box", "shard_water", "shard_seed")) {
      return [];
    }

    // If terrain is modified, only the current shard needs invalidation.
    const shardId = voxelShard(...entity?.box.v0);
    if (change.entity.shard_water) {
      return [shardId, ...shardNeighbours(shardId)];
    } else {
      return [shardId];
    }
  }

  async update(shard: TerrainShard, version: number) {
    const map = this.voxeloo.updateWater(this.map, shard.box.v0);
    try {
      return {
        changes: [
          {
            ...changeFromWater(this.voxeloo, this.replica, map),
            iffs: [[shard.id, version]] as Iff[], // Players can update water
          },
        ],
      };
    } finally {
      map.delete();
    }
  }
}
