import { DeletableScope } from "@/shared/deletable";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { lazyLoadBlockWrapper } from "@/shared/wasm/biomes";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseBlock, VolumeBlock } from "@/shared/wasm/types/biomes";

export function loadSeed(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  return lazyLoadBlockWrapper(
    voxeloo,
    () => new voxeloo.VolumeBlock_U32(),
    entity.shard_seed
  );
}

export function loadDiff(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  return lazyLoadBlockWrapper(
    voxeloo,
    () => new voxeloo.SparseBlock_U32(),
    entity.shard_diff
  );
}

export function loadShapes(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  return lazyLoadBlockWrapper(
    voxeloo,
    () => new voxeloo.SparseBlock_U32(),
    entity.shard_shapes
  );
}

export function loadTerrain(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const scope = new DeletableScope();
  try {
    const seed = scope.use(loadSeed(voxeloo, entity));
    if (seed) {
      const diff = scope.use(loadDiff(voxeloo, entity));
      if (diff) {
        seed.assign(diff);
      }
      return new Tensor(voxeloo, voxeloo.toTerrainTensor(seed));
    }
  } finally {
    scope.delete();
  }
}

export function loadIsomorphisms(
  voxeloo: VoxelooModule,
  entity: ReadonlyEntity
) {
  const shapes = loadShapes(voxeloo, entity);
  if (shapes) {
    try {
      return new Tensor(voxeloo, voxeloo.toIsomorphismTensor(shapes));
    } finally {
      shapes.delete();
    }
  }
}

export function loadSkyOcclusion(
  voxeloo: VoxelooModule,
  entity: ReadonlyEntity
) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(entity.shard_sky_occlusion?.buffer);
  return tensor;
}

export function loadIrradiance(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U32");
  tensor.load(entity.shard_irradiance?.buffer);
  return tensor;
}

export function loadWater(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(entity.shard_water?.buffer);
  return tensor;
}

export function loadOccupancy(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
  tensor.load(entity.shard_occupancy?.buffer);
  return tensor;
}

export function loadPlacer(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
  tensor.load(entity.shard_placer?.buffer);
  return tensor;
}

export function loadMuck(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(entity.shard_muck?.buffer);
  return tensor;
}

export function loadDye(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(entity.shard_dye?.buffer);
  return tensor;
}

export function loadGrowth(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(entity.shard_growth?.buffer);
  return tensor;
}

export function loadMoisture(voxeloo: VoxelooModule, entity: ReadonlyEntity) {
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(entity.shard_moisture?.buffer);
  return tensor;
}

export function usingSeed(
  voxeloo: VoxelooModule,
  selector: ReadonlyEntity,
  fn: (seed: VolumeBlock<"U32">) => void
) {
  const seed = loadSeed(voxeloo, selector);
  if (seed) {
    try {
      fn(seed);
    } finally {
      seed.delete();
    }
  }
}

export function usingDiff(
  voxeloo: VoxelooModule,
  selector: ReadonlyEntity,
  fn: (diff: SparseBlock<"U32">) => void
) {
  const diff = loadDiff(voxeloo, selector);
  if (diff) {
    try {
      fn(diff);
    } finally {
      diff.delete();
    }
  }
}

export function usingDye(
  voxeloo: VoxelooModule,
  selector: ReadonlyEntity,
  fn: (dye: Tensor<"U8">) => void
) {
  const dye = loadDye(voxeloo, selector);
  if (dye) {
    try {
      fn(dye);
    } finally {
      dye.delete();
    }
  }
}

export function usingGrowth(
  voxeloo: VoxelooModule,
  selector: ReadonlyEntity,
  fn: (growth: Tensor<"U8">) => void
) {
  const growth = loadGrowth(voxeloo, selector);
  if (growth) {
    try {
      fn(growth);
    } finally {
      growth.delete();
    }
  }
}

export function usingWater(
  voxeloo: VoxelooModule,
  selector: ReadonlyEntity,
  fn: (water: Tensor<"U8">) => void
) {
  const water = loadWater(voxeloo, selector);
  if (water) {
    try {
      fn(water);
    } finally {
      water.delete();
    }
  }
}

export function usingIrradiance(
  voxeloo: VoxelooModule,
  selector: ReadonlyEntity,
  fn: (irradiance: Tensor<"U32">) => void
) {
  const irradiance = loadIrradiance(voxeloo, selector);
  if (irradiance) {
    try {
      fn(irradiance);
    } finally {
      irradiance.delete();
    }
  }
}

export function usingSkyOcclusion(
  voxeloo: VoxelooModule,
  selector: ReadonlyEntity,
  fn: (skyOcclusion: Tensor<"U8">) => void
) {
  const skyOcclusion = loadSkyOcclusion(voxeloo, selector);
  if (skyOcclusion) {
    try {
      fn(skyOcclusion);
    } finally {
      skyOcclusion.delete();
    }
  }
}
