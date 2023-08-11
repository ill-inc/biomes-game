import type { GaiaServerContext } from "@/server/gaia_v2/context";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import { worldMapShards } from "@/server/gaia_v2/terrain/world_map";
import type { WorldApi } from "@/server/shared/world/api";
import type { ChangeToApply } from "@/shared/api/transaction";
import type { ProposedChange } from "@/shared/ecs/change";
import {
  ShardIrradiance,
  ShardMuck,
  ShardSkyOcclusion,
  ShardWater,
} from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import type { DataType } from "@/shared/wasm/tensors";
import { Tensor, tensorDataDiffers } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { WorldMap } from "@/shared/wasm/types/gaia";

const gaiaTerrainEmitterChangeCount = createCounter({
  name: "gaia_terrain_emitter_change_count",
  help: "Number of emitted events",
});

const gaiaTerrainEmitterErrorCount = createCounter({
  name: "gaia_terrain_emitter_error_count",
  help: "Number of emitted events that resulted in an error",
});

function changeFromWorldMap<T extends DataType>(
  voxeloo: VoxelooModule,
  replica: GaiaReplica,
  map: WorldMap<T>,
  changeFn: (
    entity: ReadonlyEntity,
    tensor: Tensor<T>
  ) => Partial<ReadonlyEntity> | undefined
) {
  const changes: ProposedChange[] = [];
  for (const [shardId, chunk] of worldMapShards(map)) {
    const entity = replica.table.get(TerrainShardSelector.query.key(shardId));
    if (entity) {
      const delta = changeFn(entity, new Tensor(voxeloo, chunk));
      if (delta) {
        changes.push({
          kind: "update",
          entity: {
            id: entity.id,
            ...delta,
          },
        });
      }
    }
  }

  if (changes.length > 0) {
    return <ChangeToApply>{ changes };
  }
}

export function changeFromMuck(
  voxeloo: VoxelooModule,
  replica: GaiaReplica,
  map: WorldMap<"U8">
) {
  return changeFromWorldMap(voxeloo, replica, map, (entity, tensor) => {
    const buffer = tensor.save();
    if (tensorDataDiffers({ buffer }, entity.shard_muck)) {
      return {
        shard_muck: ShardMuck.create({ buffer }),
      };
    }
  });
}

export function changeFromWater(
  voxeloo: VoxelooModule,
  replica: GaiaReplica,
  map: WorldMap<"U8">
) {
  return changeFromWorldMap(voxeloo, replica, map, (entity, tensor) => {
    const out = tensor.saveWrapped();
    if (tensorDataDiffers(out, entity.shard_water)) {
      return {
        shard_water: ShardWater.create(out),
      };
    }
  });
}

export function changeFromIrradiance(
  voxeloo: VoxelooModule,
  replica: GaiaReplica,
  map: WorldMap<"U32">
) {
  return changeFromWorldMap(voxeloo, replica, map, (entity, tensor) => {
    const out = tensor.saveWrapped();
    if (tensorDataDiffers(out, entity.shard_irradiance)) {
      return {
        shard_irradiance: ShardIrradiance.create(out),
      };
    }
  });
}

export function changeFromSkyOcclusion(
  voxeloo: VoxelooModule,
  replica: GaiaReplica,
  map: WorldMap<"U8">
) {
  return changeFromWorldMap(voxeloo, replica, map, (entity, tensor) => {
    const out = tensor.saveWrapped();
    if (tensorDataDiffers(out, entity.shard_sky_occlusion)) {
      return {
        shard_sky_occlusion: ShardSkyOcclusion.create(out),
      };
    }
  });
}

export class TerrainEmitter {
  private readonly changes: ChangeToApply[] = [];

  constructor(private readonly worldApi: WorldApi) {}

  pushChange(...changes: ChangeToApply[]) {
    this.changes.push(...changes);
  }

  async flush() {
    const numChanges = this.changes.reduce(
      (prev, change) => prev + (change.changes?.length ?? 0),
      0
    );
    try {
      gaiaTerrainEmitterChangeCount.inc(numChanges);
      if (!CONFIG.gaiaV2DryRun && this.changes.length > 0) {
        for (const change of this.changes) {
          const { outcome } = await this.worldApi.apply(change);
          if (outcome === "aborted") {
            return "aborted";
          }
        }
        return numChanges;
      }
    } catch (error) {
      gaiaTerrainEmitterErrorCount.inc();
      log.error(`Could not send ${numChanges} events to game`, {
        error,
      });
      return "aborted";
    } finally {
      this.changes.length = 0;
    }
    return 0;
  }
}

export async function registerTerrainEmitter<C extends GaiaServerContext>(
  loader: RegistryLoader<C>
) {
  const [worldApi] = await Promise.all([loader.get("worldApi")]);
  return new TerrainEmitter(worldApi);
}
