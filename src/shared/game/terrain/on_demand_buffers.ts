import {
  ShardDiff,
  ShardDye,
  ShardFarming,
  ShardGrowth,
  ShardIrradiance,
  ShardMoisture,
  ShardMuck,
  ShardOccupancy,
  ShardPlacer,
  ShardSeed,
  ShardShapes,
  ShardSkyOcclusion,
  ShardWater,
} from "@/shared/ecs/gen/components";
import type { PatchableEntity } from "@/shared/ecs/gen/delta";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { BufferedSparseBlockU32 } from "@/shared/game/terrain/buffering/buffered_sparse_like";
import { BufferedTerrainTensor } from "@/shared/game/terrain/buffering/buffered_terrain_tensor";
import { BufferedVolumeBlockU32 } from "@/shared/game/terrain/buffering/buffered_volume_block";
import { lazyObject } from "@/shared/util/lazy";
import { loadBlock, saveBlockWrapper } from "@/shared/wasm/biomes";
import type { DataType } from "@/shared/wasm/tensors";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type {
  SparseBlock,
  ValueType,
  VolumeBlock,
} from "@/shared/wasm/types/biomes";
import { ok } from "assert";
import { mapValues } from "lodash";

export interface OnDemandSpec<
  TBacking,
  TBuffer extends {
    readonly backing: TBacking | undefined;
    readonly dirty: boolean;
    abandon(): void;
    commit(): void;
    get(x: number, y: number, z: number): any;
  }
> {
  fetch: (entity: PatchableEntity) => Uint8Array | undefined;
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => TBacking;
  backingToBuffer: (voxeloo: VoxelooModule, backing?: TBacking) => TBuffer;
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | TBacking
  ) => void;
}

// Represents an on-demand buffered copy of a backing object, typically one
// that can be expensive to create or destroy.
export class OnDemandBuffered<
  TBacking,
  TBuffer extends {
    readonly backing: TBacking | undefined;
    readonly dirty: boolean;
    delete(): void;
    abandon(): void;
    commit(): void;
    get(x: number, y: number, z: number): any;
  }
> {
  #blob: Uint8Array | undefined;
  #newBlob: Uint8Array | undefined;
  #materialized:
    | {
        buffer: TBuffer;
        dirty: boolean;
      }
    | undefined;

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly entity: PatchableEntity,
    private readonly spec: OnDemandSpec<TBacking, TBuffer>
  ) {}

  private get blob(): Uint8Array | undefined {
    if (this.#newBlob !== undefined) {
      return this.#newBlob;
    }
    if (this.#blob === undefined) {
      this.#blob = this.spec.fetch(this.entity);
    }
    return this.#blob;
  }

  // Get the buffer, creating it off the backing object if needed.
  get(): TBuffer {
    if (this.#materialized === undefined) {
      const blob = this.blob;
      const backing = blob
        ? this.spec.blobToBacking(this.voxeloo, blob)
        : undefined;
      this.#materialized = {
        buffer: this.spec.backingToBuffer(this.voxeloo, backing),
        dirty: false,
      };
      this.#newBlob = undefined;
    }
    return this.#materialized.buffer;
  }

  getUnsafeTensor(): TBacking | undefined {
    this.get();
    return this.#materialized!.buffer.backing;
  }

  getNoCommit(): Omit<TBuffer, "commit"> {
    return this.get();
  }

  getReadOnly(): Pick<TBuffer, "get"> {
    return this.get();
  }

  setBlob(blob: Uint8Array) {
    this.delete();
    this.#newBlob = blob;
  }

  // Abandon any buffered changes.
  abandon() {
    this.#newBlob = undefined;
    if (this.#materialized !== undefined) {
      this.#materialized.buffer.abandon();
    }
  }

  // Commit the buffered changes to the backing object.
  commit() {
    if (this.#newBlob !== undefined) {
      this.spec.save(this.voxeloo, this.entity, this.#newBlob);
      this.#blob = this.#newBlob;
    } else if (
      this.#materialized !== undefined &&
      this.#materialized.buffer.dirty
    ) {
      this.#materialized.buffer.commit();
      this.#materialized.dirty = true;
    }
  }

  get hasUncommitted() {
    return (
      this.#newBlob !== undefined ||
      (this.#materialized !== undefined && this.#materialized.buffer.dirty)
    );
  }

  // Finish, calling the save routine on the backing object if needed.
  finish() {
    // We do not need to handle newBlob here as it is directly
    // committed.
    this.#newBlob = undefined;
    if (this.#materialized === undefined) {
      return;
    }
    try {
      if (this.#materialized.dirty) {
        this.spec.save(
          this.voxeloo,
          this.entity,
          this.#materialized.buffer.backing
        );
      }
    } finally {
      this.delete();
    }
  }

  delete() {
    this.abandon();
    if (this.#materialized) {
      this.#materialized.buffer.delete();
      this.#materialized = undefined;
    }
  }
}

function encodeBlobBufferOrBlock<T extends ValueType>(
  voxeloo: VoxelooModule,
  b: Uint8Array | VolumeBlock<T> | SparseBlock<T>
) {
  if (b instanceof Uint8Array) {
    return { buffer: b };
  } else {
    return saveBlockWrapper(voxeloo, b);
  }
}

function encodeBlobBufferOrTensor<T extends DataType>(
  voxeloo: VoxelooModule,
  b: Uint8Array | Tensor<T>
) {
  if (b instanceof Uint8Array) {
    return { buffer: b };
  } else {
    return b.saveWrapped();
  }
}

const SEED_SPEC = {
  fetch: (entity: PatchableEntity) => {
    const seed = entity.shardSeed();
    ok(seed);
    return seed.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => {
    const seed = new voxeloo.VolumeBlock_U32();
    if (blob && blob.length > 0) {
      loadBlock(voxeloo, seed, blob);
    }
    return seed;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: VolumeBlock<"U32">) =>
    new BufferedVolumeBlockU32(voxeloo, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | VolumeBlock<"U32">
  ) => {
    ok(blobOrBacking);
    entity.setShardSeed(
      ShardSeed.create(encodeBlobBufferOrBlock(voxeloo, blobOrBacking))
    );
  },
} as const;

const DIFF_SPEC = {
  fetch: (entity: PatchableEntity) => {
    const diff = entity.shardDiff();
    ok(diff);
    return diff.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => {
    const diff = new voxeloo.SparseBlock_U32();
    if (blob && blob.length > 0) {
      loadBlock(voxeloo, diff, blob);
    }
    return diff;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: SparseBlock<"U32">) =>
    new BufferedSparseBlockU32(voxeloo, SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | SparseBlock<"U32">
  ) => {
    ok(blobOrBacking);
    entity.setShardDiff(
      ShardDiff.create(encodeBlobBufferOrBlock(voxeloo, blobOrBacking))
    );
  },
} as const;

const SHAPES_SPEC = {
  fetch: (entity: PatchableEntity) => {
    const shapes = entity.shardShapes();
    ok(shapes);
    return shapes.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => {
    const shapes = new voxeloo.SparseBlock_U32();
    if (blob && blob.length > 0) {
      loadBlock(voxeloo, shapes, blob);
    }
    return shapes;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: SparseBlock<"U32">) =>
    new BufferedSparseBlockU32(voxeloo, SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | SparseBlock<"U32">
  ) => {
    ok(blobOrBacking);
    entity.setShardShapes(
      ShardShapes.create(encodeBlobBufferOrBlock(voxeloo, blobOrBacking))
    );
  },
} as const;

const OCCUPANCY_SPEC = {
  fetch: (entity: PatchableEntity) => {
    const occupancy = entity.shardOccupancy();
    if (occupancy) {
      return occupancy.buffer;
    }
  },
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => {
    const occupancy = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
    if (blob && blob.length > 0) {
      occupancy.load(blob);
    }
    return occupancy;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"F64">) =>
    new BufferedTerrainTensor(voxeloo, "F64", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"F64">
  ) =>
    blobOrBacking
      ? entity.setShardOccupancy(
          ShardOccupancy.create(
            encodeBlobBufferOrTensor(voxeloo, blobOrBacking)
          )
        )
      : entity.clearShardOccupancy(),
} as const;

const PLACER_SPEC = {
  fetch: (entity: PatchableEntity) => {
    const placer = entity.shardPlacer();
    if (placer) {
      return placer.buffer;
    }
  },
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => {
    const placer = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
    if (blob && blob.length > 0) {
      placer.load(blob);
    }
    return placer;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"F64">) =>
    new BufferedTerrainTensor(voxeloo, "F64", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"F64">
  ) =>
    blobOrBacking
      ? entity.setShardPlacer(
          ShardPlacer.create(encodeBlobBufferOrTensor(voxeloo, blobOrBacking))
        )
      : entity.clearShardPlacer(),
} as const;

const FARMING_SPEC = {
  fetch: (entity: PatchableEntity) => {
    const farming = entity.shardFarming();
    if (farming) {
      return farming.buffer;
    }
  },
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => {
    const farming = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
    farming.load(blob);
    return farming;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"F64">) =>
    new BufferedTerrainTensor(voxeloo, "F64", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"F64">
  ) =>
    blobOrBacking
      ? entity.setShardFarming(
          ShardFarming.create(encodeBlobBufferOrTensor(voxeloo, blobOrBacking))
        )
      : entity.clearShardFarming(),
} as const;

const GROWTH_SPEC = {
  fetch: (entity: PatchableEntity) => {
    return entity.shardGrowth()?.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, buffer?: Uint8Array) => {
    const growth = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
    growth.load(buffer);
    return growth;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"U8">) =>
    new BufferedTerrainTensor(voxeloo, "U8", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"U8">
  ) =>
    blobOrBacking
      ? entity.setShardGrowth(
          ShardGrowth.create(encodeBlobBufferOrTensor(voxeloo, blobOrBacking))
        )
      : entity.clearShardGrowth(),
} as const;

const WATER_SPEC = {
  fetch: (entity: PatchableEntity) => {
    const water = entity.shardWater();
    if (water) {
      return water.buffer;
    }
  },
  blobToBacking: (voxeloo: VoxelooModule, blob?: Uint8Array) => {
    const water = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
    water.load(blob);
    return water;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"U8">) =>
    new BufferedTerrainTensor(voxeloo, "U8", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"U8">
  ) =>
    blobOrBacking
      ? entity.setShardWater(
          ShardWater.create(encodeBlobBufferOrTensor(voxeloo, blobOrBacking))
        )
      : entity.clearShardWater(),
} as const;

const DYE_SPEC = {
  fetch: (entity: PatchableEntity) => {
    return entity.shardDye()?.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, buffer?: Uint8Array) => {
    const dye = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
    dye.load(buffer);
    return dye;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"U8">) =>
    new BufferedTerrainTensor(voxeloo, "U8", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"U8">
  ) =>
    blobOrBacking
      ? entity.setShardDye(
          ShardDye.create(encodeBlobBufferOrTensor(voxeloo, blobOrBacking))
        )
      : entity.clearShardDye(),
} as const;

const MOISTURE_SPEC = {
  fetch: (entity: PatchableEntity) => {
    return entity.shardMoisture()?.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, buffer?: Uint8Array) => {
    const moisture = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
    moisture.load(buffer);
    return moisture;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"U8">) =>
    new BufferedTerrainTensor(voxeloo, "U8", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"U8">
  ) =>
    blobOrBacking
      ? entity.setShardMoisture(
          ShardMoisture.create(encodeBlobBufferOrTensor(voxeloo, blobOrBacking))
        )
      : entity.clearShardMoisture(),
} as const;

const MUCK_SPEC = {
  fetch: (entity: PatchableEntity) => {
    return entity.shardMuck()?.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, buffer?: Uint8Array) => {
    const muck = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
    muck.load(buffer);
    return muck;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"U8">) =>
    new BufferedTerrainTensor(voxeloo, "U8", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"U8">
  ) =>
    blobOrBacking
      ? entity.setShardMuck(
          ShardMuck.create(encodeBlobBufferOrTensor(voxeloo, blobOrBacking))
        )
      : entity.clearShardMuck(),
} as const;

const IRRADIANCE_SPEC = {
  fetch: (entity: PatchableEntity) => {
    return entity.shardIrradiance()?.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, buffer?: Uint8Array) => {
    const irradiance = Tensor.make(voxeloo, SHARD_SHAPE, "U32");
    irradiance.load(buffer);
    return irradiance;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"U32">) =>
    new BufferedTerrainTensor(voxeloo, "U32", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"U32">
  ) =>
    blobOrBacking
      ? entity.setShardIrradiance(
          ShardIrradiance.create(
            encodeBlobBufferOrTensor(voxeloo, blobOrBacking)
          )
        )
      : entity.clearShardIrradiance(),
} as const;

const SKY_OCCLUSION_SPEC = {
  fetch: (entity: PatchableEntity) => {
    return entity.shardSkyOcclusion()?.buffer;
  },
  blobToBacking: (voxeloo: VoxelooModule, buffer?: Uint8Array) => {
    const occlusion = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
    occlusion.load(buffer);
    return occlusion;
  },
  backingToBuffer: (voxeloo: VoxelooModule, backing?: Tensor<"U8">) =>
    new BufferedTerrainTensor(voxeloo, "U8", SHARD_SHAPE, backing),
  save: (
    voxeloo: VoxelooModule,
    entity: PatchableEntity,
    blobOrBacking?: Uint8Array | Tensor<"U8">
  ) =>
    blobOrBacking
      ? entity.setShardSkyOcclusion(
          ShardSkyOcclusion.create(
            encodeBlobBufferOrTensor(voxeloo, blobOrBacking)
          )
        )
      : entity.clearShardSkyOcclusion(),
} as const;

export const ON_DEMAND_TERRAIN_SPECS = {
  seed: SEED_SPEC,
  diff: DIFF_SPEC,
  shapes: SHAPES_SPEC,
  occupancy: OCCUPANCY_SPEC,
  placer: PLACER_SPEC,
  farming: FARMING_SPEC,
  growth: GROWTH_SPEC,
  water: WATER_SPEC,
  dye: DYE_SPEC,
  moisture: MOISTURE_SPEC,
  muck: MUCK_SPEC,
  irradiance: IRRADIANCE_SPEC,
  skyOcclusion: SKY_OCCLUSION_SPEC,
} as const;

export type OnDemandBufferedFor<T extends OnDemandSpec<any, any>> =
  OnDemandBuffered<
    ReturnType<T["blobToBacking"]>,
    ReturnType<T["backingToBuffer"]>
  >;

export function makeOnDemandTerrainBuffers(
  voxeloo: VoxelooModule,
  entity: PatchableEntity
) {
  const makeOnDemandFor =
    <T extends OnDemandSpec<any, any>>(spec: T) =>
    () =>
      new OnDemandBuffered(voxeloo, entity, spec);
  return lazyObject(
    mapValues(ON_DEMAND_TERRAIN_SPECS, (spec) => makeOnDemandFor(spec)) as {
      [K in keyof typeof ON_DEMAND_TERRAIN_SPECS]: () => OnDemandBufferedFor<
        (typeof ON_DEMAND_TERRAIN_SPECS)[K]
      >;
    }
  );
}

export type OnDemandBufferedTerrain = ReturnType<
  typeof makeOnDemandTerrainBuffers
>;
