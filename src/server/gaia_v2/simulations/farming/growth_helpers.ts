import type { TerrainID } from "@/shared/asset_defs/terrain";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { using, usingAll } from "@/shared/deletable";
import type { Vec3i } from "@/shared/ecs/gen/types";
import { add, sub } from "@/shared/math/linear";
import { SparseSet3 } from "@/shared/util/sparse";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import type {
  GrowthStage,
  FarmingFlags,
} from "@/server/gaia_v2/simulations/farming/growth_specs";
import {
  VOLUME_TENSOR_SHAPE,
  VOLUME_TENSOR_ROOT,
  unpackFarmingFlags,
  packFarmingFlags,
  plantGrowthStageSimple,
} from "@/server/gaia_v2/simulations/farming/growth_specs";

export function mapGrowthStage(
  voxeloo: VoxelooModule,
  growth: GrowthStage,
  fn: (
    pos: Vec3i,
    val: { block: TerrainID; shape?: number; flags?: FarmingFlags }
  ) => [Vec3i, { block: TerrainID; shape?: number; flags?: FarmingFlags }]
): GrowthStage {
  let blockBuffer: Uint8Array | undefined;
  let shapeBuffer: Uint8Array | undefined;
  let flagBuffer: Uint8Array | undefined;
  usingAll(
    [
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
    ],
    (
      blockTensor,
      shapeTensor,
      flagTensor,
      newBlockTensor,
      newShapeTensor,
      newFlagTensor
    ) => {
      blockTensor.load(growth.blockBuffer);
      shapeTensor.load(growth.shapeBuffer);
      flagTensor.load(growth.flagBuffer);
      const blockUpdate = new TensorUpdate(newBlockTensor);
      const shapeUpdate = new TensorUpdate(newShapeTensor);
      const flagUpdate = new TensorUpdate(newFlagTensor);
      for (const [pos, block] of blockTensor) {
        const localPos = sub(pos, VOLUME_TENSOR_ROOT);
        const shape = shapeTensor.get(...pos);
        const flags = unpackFarmingFlags(flagTensor.get(...pos));
        const [newPos, newBlock] = fn(localPos, {
          block: block,
          shape,
          flags,
        });
        const newLocalPos = add(newPos, VOLUME_TENSOR_ROOT);
        blockUpdate.set(newLocalPos, newBlock.block);
        if (newBlock.shape !== undefined) {
          shapeUpdate.set(newLocalPos, newBlock.shape);
        }
        if (newBlock.flags !== undefined) {
          flagUpdate.set(newLocalPos, packFarmingFlags(newBlock.flags));
        }
      }
      blockUpdate.apply();
      shapeUpdate.apply();
      flagUpdate.apply();
      blockBuffer = newBlockTensor.save();
      shapeBuffer = newShapeTensor.save();
      flagBuffer = newFlagTensor.save();
    }
  );
  ok(blockBuffer);
  return {
    blockBuffer,
    shapeBuffer,
    flagBuffer,
  };
}

export function joinTensorBuffers(
  voxeloo: VoxelooModule,
  first?: Uint8Array,
  second?: Uint8Array
) {
  if (first && !second) {
    return first;
  }
  if (!first && second) {
    return second;
  }
  if (!first && !second) {
    return undefined;
  }
  return usingAll(
    [
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
    ],
    (firstTensor, secondTensor) => {
      firstTensor.load(first);
      secondTensor.load(second);
      const update = new TensorUpdate(firstTensor);
      for (const [pos, val] of secondTensor) {
        if (val !== undefined) {
          update.set(pos, val);
        }
      }
      update.apply();
      return firstTensor.save();
    }
  );
}

export function diffTensorBuffers(
  voxeloo: VoxelooModule,
  first?: Uint8Array,
  second?: Uint8Array
) {
  return usingAll(
    [
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
    ],
    (diff, firstTensor, secondTensor) => {
      firstTensor.load(first);
      secondTensor.load(second);
      const seen = new SparseSet3(VOLUME_TENSOR_SHAPE);
      const update = new TensorUpdate(diff);
      for (const [pos, val] of secondTensor) {
        seen.set(pos);
        if (firstTensor.get(...pos) !== val) {
          update.set(pos, 1);
        }
      }
      for (const [pos, val] of firstTensor) {
        if (val !== undefined && !seen.has(pos)) {
          update.set(pos, 1);
        }
      }
      update.apply();
      return diff.save();
    }
  );
}

export function countTensorBuffer(voxeloo: VoxelooModule, buf?: Uint8Array) {
  let ct = 0;
  using(Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"), (tensor) => {
    tensor.load(buf);
    for (const [, val] of tensor) {
      if (val !== undefined) {
        ct++;
      }
    }
  });
  return ct;
}

export function joinGrowthStage(
  voxeloo: VoxelooModule,
  first?: GrowthStage,
  second?: GrowthStage
): GrowthStage {
  ok(first?.blockBuffer || second?.blockBuffer);
  return {
    blockBuffer: joinTensorBuffers(
      voxeloo,
      first?.blockBuffer,
      second?.blockBuffer
    )!,
    shapeBuffer: joinTensorBuffers(
      voxeloo,
      first?.shapeBuffer,
      second?.shapeBuffer
    ),
    flagBuffer: joinTensorBuffers(
      voxeloo,
      first?.flagBuffer,
      second?.flagBuffer
    ),
  };
}

export function diffGrowthStage(
  voxeloo: VoxelooModule,
  first?: GrowthStage,
  second?: GrowthStage
): GrowthStage {
  if (!first && !second) {
    throw new Error("Cannot diff undefined growth stages");
  } else if (!first) {
    return second!;
  } else if (!second) {
    return first;
  }

  return {
    blockBuffer: diffTensorBuffers(
      voxeloo,
      first?.blockBuffer,
      second?.blockBuffer
    ),
    shapeBuffer: diffTensorBuffers(
      voxeloo,
      first?.shapeBuffer,
      second?.shapeBuffer
    ),
    flagBuffer: diffTensorBuffers(
      voxeloo,
      first?.flagBuffer,
      second?.flagBuffer
    ),
  };
}

export function countGrowthStage(
  voxeloo: VoxelooModule,
  stage: GrowthStage
): number {
  return usingAll(
    [
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
    ],
    (blockTensor, shapeTensor, flagTensor) => {
      blockTensor.load(stage.blockBuffer);
      shapeTensor.load(stage.shapeBuffer);
      flagTensor.load(stage.flagBuffer);
      const seen = new SparseSet3(VOLUME_TENSOR_SHAPE);
      for (const tensor of [blockTensor, shapeTensor, flagTensor]) {
        for (const [pos, val] of tensor) {
          if (val !== undefined) {
            seen.set(pos);
          }
        }
      }
      return seen.size;
    }
  );
}

export function translateGrowthStage(
  voxeloo: VoxelooModule,
  stage: GrowthStage,
  offset: Vec3i
) {
  return mapGrowthStage(voxeloo, stage, (pos, val) => [add(pos, offset), val]);
}

export function withTilledSoil(voxeloo: VoxelooModule, growth?: GrowthStage) {
  return joinGrowthStage(
    voxeloo,
    growth ? translateGrowthStage(voxeloo, growth, [0, 1, 0]) : undefined,
    plantGrowthStageSimple(voxeloo, getTerrainID("soil"), 0, {
      required: true,
      dropBlock: false,
      startProgress: 1,
      endProgress: 1,
      removeWhenDestroyed: false,
    })
  );
}

export function withDirt(voxeloo: VoxelooModule, growth?: GrowthStage) {
  return joinGrowthStage(
    voxeloo,
    growth ? translateGrowthStage(voxeloo, growth, [0, 1, 0]) : undefined,
    plantGrowthStageSimple(voxeloo, getTerrainID("dirt"), 0, {
      required: true,
      dropBlock: false,
      startProgress: 1,
      endProgress: 1,
      removeWhenDestroyed: false,
    })
  );
}
