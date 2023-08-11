import { Simulation } from "@/server/gaia_v2/simulations/api";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import { changeFromSkyOcclusion } from "@/server/gaia_v2/terrain/emitter";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import type { Vec2i } from "@/shared/ecs/gen/types";
import type { ShardId } from "@/shared/game/shard";
import {
  shardAlign,
  shardDecode,
  shardEncode,
  voxelShard,
} from "@/shared/game/shard";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaTerrainMapV2 } from "@/shared/wasm/types/gaia";
import { compact } from "lodash";

function columnAlign(x: number, y: number, z: number) {
  const [cx, _, cz] = shardAlign(x, 0, z);
  return [cx, cz] as Vec2i;
}

function shardDependencies(id: ShardId) {
  const [x, y, z] = shardDecode(id);
  const ret: ShardId[] = [];
  for (let dz = -1; dz <= 1; ++dz) {
    for (let dx = -1; dx <= 1; ++dx) {
      ret.push(shardEncode(x + dx, y, z + dz));
    }
  }
  return ret;
}

export class SkyOcclusionSimulation extends Simulation {
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly map: GaiaTerrainMapV2
  ) {
    super("sky_occlusion");
  }

  reduce(shards: Set<ShardId>) {
    for (const shard of shards) {
      const [x, _, y] = shardDecode(shard);
      const column = shardEncode(x, 0, y);
      if (column === shard) {
        // No work, is already normalized.
        continue;
      }
      shards.delete(shard);
      shards.add(column);
    }
  }

  invalidate(change: Change): ShardId[] {
    if (change.kind === "delete") {
      return [];
    }

    if (!change.entity.shard_diff && !change.entity.shard_seed) {
      return []; // No change to landscape, so no need to update.
    }

    const entity = this.replica.table.get(change.entity.id);
    if (!Entity.has(entity, "box")) {
      return [];
    }

    const shardId = voxelShard(...entity.box.v0);
    return shardDependencies(shardId);
  }

  async update(shard: TerrainShard) {
    const column = columnAlign(...shard.box.v0);
    const terrainMap = this.voxeloo.updateOcclusion(this.map, column);
    try {
      return {
        changes: compact([
          changeFromSkyOcclusion(this.voxeloo, this.replica, terrainMap),
        ]),
      };
    } finally {
      terrainMap.delete();
    }
  }
}
