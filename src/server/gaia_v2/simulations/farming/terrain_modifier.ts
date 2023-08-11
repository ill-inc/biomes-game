import type {
  FarmingChangeBatcher,
  Plant,
} from "@/server/gaia_v2/simulations/farming/change_batcher";
import {
  farmTensorToWorld,
  farmWorldToTensor,
} from "@/server/gaia_v2/simulations/farming/plant_ticker";
import { using } from "@/shared/deletable";
import type { ReadonlyVec3i, Vec3i } from "@/shared/ecs/gen/types";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import { makeWorldMap } from "@/server/gaia_v2/simulations/farming/map";
import { voxelShard } from "@/shared/game/shard";

export class FarmingPlantTerrainModifier {
  changes = makeWorldMap<{
    block: number;
    farming: number;
    growth?: number;
    moisture?: number;
    shape?: number;
  }>();
  constructor(
    private readonly voxeloo: VoxelooModule,
    public readonly plant: Plant,
    public readonly changeBatcher: FarmingChangeBatcher,
    public readonly tensorShape: Vec3i,
    public readonly tensorAnchor: Vec3i
  ) {}

  get entity() {
    return this.plant.entity;
  }

  canModify(pos: ReadonlyVec3i) {
    if (this.changes.has(pos)) {
      // We've already determined we can change this voxel
      return true;
    }
    // Voxel is owned by this plant entity
    if (this.changeBatcher.getTerrainFarming(pos) === this.entity.id) {
      return true;
    }

    // Don't modify voxels that are part of any occupancy
    if (this.changeBatcher.getTerrainOccupancy(pos)) {
      return false;
    }

    if (this.changeBatcher.getTerrainBlock(pos)) {
      // Voxel is not empty
      return false;
    }

    return true;
  }

  expectedBlocks() {
    const tensor = Tensor.make(this.voxeloo, this.tensorShape, "U32");
    const expectedBlob =
      this.entity.mutableFarmingPlantComponent().expected_blocks;
    tensor.load(expectedBlob);
    return tensor;
  }

  clear() {
    using(this.expectedBlocks(), (tensor) => {
      for (const [tensorPos] of tensor) {
        const pos = farmTensorToWorld(tensorPos, this.tensorAnchor);
        if (!this.canModify(pos)) {
          // If we think we can modify this, then this is incorrect and we fix this here:
          this.changes.set(pos, {
            block: this.changeBatcher.getTerrainBlock(pos) ?? 0,
            growth: 0,
            moisture: 0,
            farming: 0,
          });
          return;
        }
        const block = 0;
        this.changes.set(pos, {
          block,
          shape: 0,
          moisture: 0,
          growth: 0,
          farming: 0,
        });
      }
    });
  }

  relinquish() {
    // Keep blocks but remove ownership over them
    using(this.expectedBlocks(), (tensor) => {
      for (const [tensorPos] of tensor) {
        const pos = farmTensorToWorld(tensorPos, this.tensorAnchor);
        if (
          this.canModify(pos) &&
          this.changeBatcher.getTerrainFarming(pos) === this.entity.id
        ) {
          const block = this.changeBatcher.getTerrainBlock(pos) || 0;
          this.changes.set(pos, {
            block,
            moisture: 0,
            farming: 0,
          });
        }
      }
    });
  }

  setTensorPos(
    localPos: ReadonlyVec3i,
    block: number,
    farming?: number,
    growth?: number,
    moisture?: number,
    shape?: number
  ) {
    const pos = farmTensorToWorld(localPos, this.tensorAnchor);
    return this.set(pos, block, farming, growth, moisture, shape);
  }

  getTensorPos(tensorPos: ReadonlyVec3i) {
    const pos = farmTensorToWorld(tensorPos, this.tensorAnchor);
    return this.get(pos);
  }

  set(
    pos: ReadonlyVec3,
    block: number,
    farming?: number,
    growth?: number,
    moisture?: number,
    shape?: number
  ) {
    farming ??= this.entity.id;
    if (farming === this.entity.id && !this.canModify(pos)) {
      return false;
    }
    this.changes.set(pos, {
      block,
      farming,
      growth,
      moisture,
      shape,
    });
    return true;
  }

  get(pos: ReadonlyVec3) {
    if (this.changes.has(pos)) {
      return this.changes.get(pos);
    }
    return {
      block: this.changeBatcher.getTerrainBlock(pos),
      farming: this.changeBatcher.getTerrainFarming(pos),
      growth: this.changeBatcher.getTerrainGrowth(pos),
      moisture: this.changeBatcher.getTerrainMoisture(pos),
      shape: this.changeBatcher.getTerrainShape(pos),
    };
  }

  apply() {
    using(Tensor.make(this.voxeloo, this.tensorShape, "U32"), (tensor) => {
      const existingBlob =
        this.entity.mutableFarmingPlantComponent().expected_blocks;
      tensor.load(existingBlob);
      const update = new TensorUpdate(tensor);
      for (const [pos, change] of this.changes) {
        const farming = change.farming ?? this.entity.id;
        this.changeBatcher.setTerrain(
          pos,
          change.block,
          farming,
          change.growth,
          change.moisture,
          change.shape
        );
        this.plant.modifiedShards.add(voxelShard(...pos));
        update.set(
          farmWorldToTensor(pos, this.tensorAnchor),
          farming === this.entity.id ? change.block : 0
        );
      }
      update.apply();
      this.entity.mutableFarmingPlantComponent().expected_blocks = tensor
        .save()
        .toString("base64");
    });
    this.changes.clear();
  }

  delete() {
    this.apply();
  }
}
