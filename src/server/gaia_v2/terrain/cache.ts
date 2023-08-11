import type { GaiaReplica } from "@/server/gaia_v2/table";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import type { ShardId } from "@/shared/game/shard";
import {
  loadDiff,
  loadDye,
  loadIrradiance,
  loadIsomorphisms,
  loadMoisture,
  loadMuck,
  loadOccupancy,
  loadPlacer,
  loadSeed,
  loadSkyOcclusion,
  loadTerrain,
  loadWater,
} from "@/shared/game/terrain";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { VoxelooModule } from "@/shared/wasm/types";

export class TensorCache {
  private readonly map = new Map<string, { delete: () => void } | undefined>();
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica
  ) {}

  shard(shardId: string) {
    return this.replica.table.get(TerrainShardSelector.query.key(shardId));
  }

  get<T extends { delete: () => void }>(
    kind: string,
    shardId: ShardId,
    build: (entity: ReadonlyEntity) => T | undefined
  ) {
    const key = `${kind}:${shardId}`;
    if (!this.map.has(key)) {
      const shard = this.shard(shardId);
      this.map.set(key, shard ? build(shard) : undefined);
    }
    return this.map.get(key) as T | undefined;
  }

  getSeed(id: ShardId) {
    return this.get("seed", id, (shard) => loadSeed(this.voxeloo, shard));
  }

  getDiff(id: ShardId) {
    return this.get("diff", id, (shard) => loadDiff(this.voxeloo, shard));
  }

  getTerrain(id: ShardId) {
    return this.get("terrain", id, (shard) => loadTerrain(this.voxeloo, shard));
  }

  getIsomorphisms(id: ShardId) {
    return this.get("isomorphisms", id, (shard) =>
      loadIsomorphisms(this.voxeloo, shard)
    );
  }

  getIrradiance(id: ShardId) {
    return this.get("irradiance", id, (shard) =>
      loadIrradiance(this.voxeloo, shard)
    );
  }

  getSkyOcclusion(id: ShardId) {
    return this.get("sky_occlusion", id, (shard) =>
      loadSkyOcclusion(this.voxeloo, shard)
    );
  }

  getMuck(id: ShardId) {
    return this.get("muck", id, (shard) => loadMuck(this.voxeloo, shard));
  }

  getWater(id: ShardId) {
    return this.get("water", id, (shard) => loadWater(this.voxeloo, shard));
  }

  getDye(id: ShardId) {
    return this.get("dye", id, (shard) => loadDye(this.voxeloo, shard));
  }

  getMoisture(id: ShardId) {
    return this.get("moisture", id, (shard) =>
      loadMoisture(this.voxeloo, shard)
    );
  }

  getPlacer(id: ShardId) {
    return this.get("placer", id, (shard) => loadPlacer(this.voxeloo, shard));
  }

  getOccupancy(id: ShardId) {
    return this.get("occupancy", id, (shard) =>
      loadOccupancy(this.voxeloo, shard)
    );
  }

  delete() {
    for (const tensor of this.map.values()) {
      if (tensor) {
        tensor.delete();
      }
    }
  }
}

// TODO: Replace this with the resource cache so that terrain data in the cache
// can be persisted across updates (instead of only caching within one update).
export function terrainHelperFromTensorCache(
  voxeloo: VoxelooModule,
  cache: TensorCache
) {
  return new TerrainHelper(
    voxeloo,
    (id) => cache.getSeed(id),
    (id) => cache.getTerrain(id),
    (id) => cache.getIsomorphisms(id),
    (id) => cache.getIrradiance(id),
    (id) => cache.getSkyOcclusion(id),
    (id) => cache.getMuck(id),
    (id) => cache.getWater(id),
    (id) => cache.getDye(id),
    (id) => cache.getMoisture(id),
    (id) => cache.getPlacer(id),
    (id) => cache.getOccupancy(id)
  );
}
