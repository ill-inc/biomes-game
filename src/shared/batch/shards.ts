import { usingAll } from "@/shared/deletable";
import type { Entity } from "@/shared/ecs/gen/entities";
import {
  loadDiff,
  loadDye,
  loadIrradiance,
  loadOccupancy,
  loadPlacer,
  loadSeed,
  loadShapes,
  loadSkyOcclusion,
  loadTerrain,
  loadWater,
} from "@/shared/game/terrain";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { AABB } from "@/shared/math/types";
import type { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseBlock, VolumeBlock } from "@/shared/wasm/types/biomes";

const SHARD_COMPONENTS = [
  "seed",
  "diff",
  "shapes",
  "occupancy",
  "placer",
  "sky_occlusion",
  "irradiance",
  "water",
  "dye",
] as const;

export type ShardComponent = (typeof SHARD_COMPONENTS)[number];

export function isShardComponent(name: string): name is ShardComponent {
  return SHARD_COMPONENTS.includes(name as ShardComponent);
}

export function allShardComponents(names: string[]): names is ShardComponent[] {
  return names.every(isShardComponent);
}

export interface Shard {
  id: BiomesId;
  aabb: AABB;
  seed?: VolumeBlock<"U32">;
  diff?: SparseBlock<"U32">;
  shapes?: SparseBlock<"U32">;
  occupancy?: Tensor<"F64">;
  placer?: Tensor<"F64">;
  terrain?: Tensor<"U32">;
  skyOcclusion?: Tensor<"U8">;
  irradiance?: Tensor<"U32">;
  water?: Tensor<"U8">;
  dye?: Tensor<"U8">;
}

export function loadShard(
  voxeloo: VoxelooModule,
  entity: Entity,
  fn: (shard: Shard) => void
) {
  if (!entity.box) {
    return;
  }
  usingAll(
    [
      loadSeed(voxeloo, entity),
      loadDiff(voxeloo, entity),
      loadShapes(voxeloo, entity),
      loadOccupancy(voxeloo, entity),
      loadPlacer(voxeloo, entity),
      loadTerrain(voxeloo, entity),
      loadSkyOcclusion(voxeloo, entity),
      loadIrradiance(voxeloo, entity),
      loadWater(voxeloo, entity),
      loadDye(voxeloo, entity),
    ],
    (
      seed,
      diff,
      shapes,
      occupancy,
      placer,
      terrain,
      skyOcclusion,
      irradiance,
      water,
      dye
    ) => {
      if (
        !seed &&
        !diff &&
        !shapes &&
        !occupancy &&
        !placer &&
        !terrain &&
        !skyOcclusion &&
        !irradiance &&
        !water &&
        !dye
      ) {
        return;
      }

      fn({
        id: entity.id,
        aabb: [[...entity.box!.v0], [...entity.box!.v1]],
        seed,
        diff,
        shapes,
        occupancy,
        placer,
        terrain,
        skyOcclusion,
        irradiance,
        water,
        dye,
      });
    }
  );
}

export async function loadShardsWithVersions(
  voxeloo: VoxelooModule,
  entities: AsyncIterable<readonly [number, Entity]>,
  fn: (version: number, shard: Shard) => void
) {
  let i = 0;
  for await (const [version, entity] of entities) {
    if (i++ % 10_000 == 0) {
      log.info(`Read ${i} shards from world...`);
    }
    loadShard(voxeloo, entity, (shard) => fn(version, shard));
  }
}
