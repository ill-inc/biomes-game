import type { AsDelta, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { loadBlockWrapper, saveBlockWrapper } from "@/shared/wasm/biomes";
import { Tensor, TensorUpdate, tensorDataDiffers } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseBlock, VolumeBlock } from "@/shared/wasm/types/biomes";

// TODO: Unify this terrain helper class with the logic-tier equivalent.
export class TerrainMutator {
  #seed?: VolumeBlock<"U32">;
  #diff?: SparseBlock<"U32">;
  #shapes?: SparseBlock<"U32">;
  #occupancy?: TensorUpdate<"F64">;
  #placer?: TensorUpdate<"F64">;
  #farming?: TensorUpdate<"F64">;
  #growth?: TensorUpdate<"U8">;
  #moisture?: TensorUpdate<"U8">;
  #dye?: TensorUpdate<"U8">;

  constructor(
    private readonly voxeloo: VoxelooModule,
    readonly entity: ReadonlyEntity
  ) {}

  delete() {
    this.#seed?.delete();
    this.#diff?.delete();
    this.#shapes?.delete();
    this.#occupancy?.tensor.delete();
    this.#placer?.tensor.delete();
    this.#farming?.tensor.delete();
    this.#growth?.tensor.delete();
    this.#moisture?.tensor.delete();
    this.#dye?.tensor.delete();
  }

  get seed() {
    if (!this.#seed) {
      this.#seed = new this.voxeloo.VolumeBlock_U32();
      loadBlockWrapper(this.voxeloo, this.#seed, this.entity.shard_seed);
    }
    return this.#seed;
  }

  get diff() {
    if (!this.#diff) {
      this.#diff = new this.voxeloo.SparseBlock_U32();
      loadBlockWrapper(this.voxeloo, this.#diff, this.entity.shard_diff);
    }
    return this.#diff;
  }

  get shapes() {
    if (!this.#shapes) {
      this.#shapes = new this.voxeloo.SparseBlock_U32();
      loadBlockWrapper(this.voxeloo, this.#shapes, this.entity.shard_shapes);
    }
    return this.#shapes;
  }

  get occupancy() {
    if (!this.#occupancy) {
      this.#occupancy = new TensorUpdate(
        Tensor.make(this.voxeloo, SHARD_SHAPE, "F64")
      );
      this.#occupancy.tensor.load(this.entity.shard_occupancy?.buffer);
    }
    return this.#occupancy;
  }

  get placer() {
    if (!this.#placer) {
      this.#placer = new TensorUpdate(
        Tensor.make(this.voxeloo, SHARD_SHAPE, "F64")
      );
      this.#placer.tensor.load(this.entity.shard_placer?.buffer);
    }
    return this.#placer;
  }

  get farming() {
    if (!this.#farming) {
      this.#farming = new TensorUpdate(
        Tensor.make(this.voxeloo, SHARD_SHAPE, "F64")
      );
      this.#farming.tensor.load(this.entity.shard_farming?.buffer);
    }
    return this.#farming;
  }

  get growth() {
    if (!this.#growth) {
      this.#growth = new TensorUpdate(
        Tensor.make(this.voxeloo, SHARD_SHAPE, "U8")
      );
      this.#growth.tensor.load(this.entity.shard_growth?.buffer);
    }
    return this.#growth;
  }

  get moisture() {
    if (!this.#moisture) {
      this.#moisture = new TensorUpdate(
        Tensor.make(this.voxeloo, SHARD_SHAPE, "U8")
      );
      this.#moisture.tensor.load(this.entity.shard_moisture?.buffer);
    }
    return this.#moisture;
  }

  get dye() {
    if (!this.#dye) {
      this.#dye = new TensorUpdate(
        Tensor.make(this.voxeloo, SHARD_SHAPE, "U8")
      );
      this.#dye.tensor.load(this.entity.shard_dye?.buffer);
    }
    return this.#dye;
  }

  apply() {
    let updated = false;
    const delta: AsDelta<ReadonlyEntity> = { id: this.entity.id };
    if (this.#diff) {
      const out = saveBlockWrapper(this.voxeloo, this.#diff);
      if (tensorDataDiffers(out, this.entity.shard_diff)) {
        delta.shard_diff = out;
        updated = true;
      }
    }
    if (this.#shapes) {
      const out = saveBlockWrapper(this.voxeloo, this.#shapes);
      if (tensorDataDiffers(out, this.entity.shard_shapes)) {
        delta.shard_shapes = out;
        updated = true;
      }
    }
    if (this.#occupancy) {
      this.#occupancy.apply();
      const out = this.#occupancy.tensor.saveWrapped();
      if (tensorDataDiffers(out, this.entity.shard_occupancy)) {
        delta.shard_occupancy = out;
        updated = true;
      }
    }
    if (this.#placer) {
      this.#placer.apply();
      const out = this.#placer.tensor.saveWrapped();
      if (tensorDataDiffers(out, this.entity.shard_placer)) {
        delta.shard_placer = out;
        updated = true;
      }
    }
    if (this.#farming) {
      this.#farming.apply();
      const out = this.#farming.tensor.saveWrapped();
      if (tensorDataDiffers(out, this.entity.shard_farming)) {
        delta.shard_farming = out;
        updated = true;
      }
    }
    if (this.#growth) {
      this.#growth.apply();
      const out = this.#growth.tensor.saveWrapped();
      if (tensorDataDiffers(out, this.entity.shard_growth)) {
        delta.shard_growth = out;
        updated = true;
      }
    }
    if (this.#moisture) {
      this.#moisture.apply();
      const out = this.#moisture.tensor.saveWrapped();
      if (tensorDataDiffers(out, this.entity.shard_moisture)) {
        delta.shard_moisture = out;
        updated = true;
      }
    }
    if (this.#dye) {
      this.#dye.apply();
      const out = this.#dye.tensor.saveWrapped();
      if (tensorDataDiffers(out, this.entity.shard_dye)) {
        delta.shard_dye = out;
        updated = true;
      }
    }
    return [updated, delta] as const;
  }
}
