import {
  growthDeath,
  growthStageForProgress,
  growthWilt,
} from "@/shared/asset_defs/growth";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { using, usingAll } from "@/shared/deletable";
import type { Vec3i } from "@/shared/ecs/gen/types";
import { isGlassId } from "@/shared/game/ids";
import { add } from "@/shared/math/linear";
import { clamp, lerp } from "@/shared/math/math";
import { Sparse2, SparseSet3 } from "@/shared/util/sparse";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import {
  diffGrowthStage,
  countGrowthStage,
} from "@/server/gaia_v2/simulations/farming/growth_helpers";
import type {
  GrowthStage,
  FarmingFlags,
} from "@/server/gaia_v2/simulations/farming/growth_specs";
import {
  unpackFarmingFlags,
  VOLUME_TENSOR_SHAPE,
} from "@/server/gaia_v2/simulations/farming/growth_specs";
import { farmTensorToWorld } from "@/server/gaia_v2/simulations/farming/plant_ticker";
import { farmLog } from "@/server/gaia_v2/simulations/farming/util";
import type { FarmingPlantTerrainModifier } from "@/server/gaia_v2/simulations/farming/terrain_modifier";

function moistureForWaterLevel(waterLevel: number) {
  return Math.floor(clamp(waterLevel * 100, 0, 100));
}

export class GrowthTransition {
  private numDiffBlocks: number;
  private growthDiff: GrowthStage;
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly growthTo: GrowthStage,
    growthFrom?: GrowthStage
  ) {
    this.growthDiff = diffGrowthStage(voxeloo, growthFrom, growthTo);
    this.numDiffBlocks = countGrowthStage(voxeloo, this.growthDiff);
  }

  progress(
    terrainModifier: FarmingPlantTerrainModifier,
    oldProgress: number,
    newProgress: number,
    waterLevel: number
  ) {
    farmLog(
      `    [Growth] Progressing from ${oldProgress} to ${newProgress}`,
      3
    );
    let numBlocksToAdd = 0;
    if (this.numDiffBlocks > 0) {
      const numBlocksOld = Math.floor(oldProgress * this.numDiffBlocks);
      const numBlocksNew = Math.floor(newProgress * this.numDiffBlocks);
      numBlocksToAdd = numBlocksNew - numBlocksOld;
      farmLog(
        `    [Growth] Adding/Modifying ${numBlocksToAdd} blocks (${this.numDiffBlocks} total, ${numBlocksOld} previously added)`,
        3
      );
    } else {
      farmLog(`    [Growth] No blocks to add`, 3);
    }

    this.addBlocks(terrainModifier, numBlocksToAdd);
    // For all blocks that exist, update their progress
    this.updateGrowthAndMoisture(terrainModifier, newProgress, waterLevel);
  }

  forceFinish(terrainModifier: FarmingPlantTerrainModifier) {
    farmLog(`    [Growth] Forcing finish`, 3);
    // Just stamp growthTo for all blocks applicable.
    usingAll(
      [
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
      ],
      (blockTensor, shapeTensor, flagTensor) => {
        blockTensor.load(this.growthTo.blockBuffer);
        shapeTensor.load(this.growthTo.shapeBuffer);
        flagTensor.load(this.growthTo.flagBuffer);
        for (const [tensorPos, block] of blockTensor) {
          const flags = unpackFarmingFlags(flagTensor.get(...tensorPos));
          const growth = flags.writeGrowthProgress
            ? growthStageForProgress(block, flags.endProgress)
            : 0;
          terrainModifier.setTensorPos(
            tensorPos,
            block,
            undefined,
            growth,
            0,
            shapeTensor.get(...tensorPos)
          );
        }
      }
    );
  }

  checkDestroyedBlocks(
    terrainModifier: FarmingPlantTerrainModifier,
    callback: (pos: Vec3i, block: TerrainID, flags: FarmingFlags) => void
  ) {
    usingAll(
      [
        terrainModifier.expectedBlocks(),
        Tensor.make(this.voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      ],
      (expectedBlocks, flagTensor) => {
        flagTensor.load(this.growthTo.flagBuffer);
        for (const [tensorPos, block] of expectedBlocks) {
          const pos = farmTensorToWorld(
            tensorPos,
            terrainModifier.tensorAnchor
          );
          const worldBlock = terrainModifier.getTensorPos(tensorPos);
          if (
            block !== (worldBlock?.block || 0) ||
            terrainModifier.entity.id !== (worldBlock?.farming || 0)
          ) {
            callback(
              pos,
              block,
              unpackFarmingFlags(flagTensor.get(...tensorPos))
            );
          }
        }
      }
    );
  }

  wilt(
    terrainModifier: FarmingPlantTerrainModifier,
    progress: number,
    waterLevel: number
  ) {
    this.mapExistingWithFlags(terrainModifier, (tensorPos, block, flags) => {
      const stage = flags.writeGrowthProgress
        ? growthStageForProgress(block, progress)
        : 0;
      const growth = growthWilt(block, stage);
      terrainModifier.setTensorPos(
        tensorPos,
        block,
        undefined,
        growth,
        moistureForWaterLevel(waterLevel)
      );
    });
  }

  unwilt(
    terrainModifier: FarmingPlantTerrainModifier,
    progress: number,
    waterLevel: number
  ) {
    this.mapExistingWithFlags(terrainModifier, (tensorPos, block, flags) => {
      const stage = flags.writeGrowthProgress
        ? growthStageForProgress(block, progress)
        : 0;
      terrainModifier.setTensorPos(
        tensorPos,
        block,
        undefined,
        stage,
        moistureForWaterLevel(waterLevel)
      );
    });
  }

  death(
    terrainModifier: FarmingPlantTerrainModifier,
    progress: number,
    waterLevel: number
  ) {
    this.mapExistingWithFlags(terrainModifier, (tensorPos, block, flags) => {
      const stage = flags.writeGrowthProgress
        ? growthStageForProgress(block, progress)
        : 0;
      const growth = growthDeath(block, stage);
      terrainModifier.setTensorPos(
        tensorPos,
        block,
        undefined,
        growth,
        moistureForWaterLevel(waterLevel)
      );
    });
  }

  private highestVerticalBlocks(terrainModifier: FarmingPlantTerrainModifier) {
    const highestBlocksXZ = new Sparse2<number>([
      terrainModifier.tensorShape[0],
      terrainModifier.tensorShape[2],
    ]);
    using(terrainModifier.expectedBlocks(), (expectedBlocks) => {
      for (const [tensorPos] of expectedBlocks) {
        const highest = highestBlocksXZ.get([tensorPos[0], tensorPos[2]]);
        if (highest === undefined || highest < tensorPos[1]) {
          highestBlocksXZ.set([tensorPos[0], tensorPos[2]], tensorPos[1]);
        }
      }
    });
    return [...highestBlocksXZ].map(([[x, z], y]) =>
      farmTensorToWorld([x, y, z], terrainModifier.tensorAnchor)
    );
  }

  canSeeSun(terrainModifier: FarmingPlantTerrainModifier) {
    // Can any block see the sun?
    const heightLimit =
      terrainModifier.changeBatcher.getWorldMetadata()?.aabb.v1[1];
    if (heightLimit === undefined) {
      farmLog("error: No height limit for farm");
      return true;
    }
    for (const highestBlock of this.highestVerticalBlocks(terrainModifier)) {
      let curY = highestBlock[1] + 1;
      let blockCanSeeSun = true;
      while (curY < heightLimit) {
        const block = terrainModifier.changeBatcher.getTerrainBlock([
          highestBlock[0],
          curY,
          highestBlock[2],
        ]);
        if (block && !isGlassId(block)) {
          blockCanSeeSun = false;
          break;
        }
        curY++;
      }
      if (blockCanSeeSun) {
        return true;
      }
    }
    return false;
  }

  isShaded(terrainModifier: FarmingPlantTerrainModifier) {
    // Is every block shaded by something?
    return !this.canSeeSun(terrainModifier);
  }

  private mapExistingWithFlags(
    terrainModifier: FarmingPlantTerrainModifier,
    callback: (tensorPos: Vec3i, block: TerrainID, flags: FarmingFlags) => void
  ) {
    usingAll(
      [
        terrainModifier.expectedBlocks(),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
      ],
      (expectedBlocks, flagTensor) => {
        flagTensor.load(this.growthTo.flagBuffer);
        for (const [tensorPos, block] of expectedBlocks) {
          callback(
            tensorPos,
            block,
            unpackFarmingFlags(flagTensor.get(...tensorPos))
          );
        }
      }
    );
  }

  destroy(
    terrainModifier: FarmingPlantTerrainModifier,
    destroyAllBlocks = false
  ) {
    // Apply any pending changes first.
    terrainModifier.apply();
    // Remove all blocks that are to be destroyed when the plant is destroyed
    usingAll(
      [
        terrainModifier.expectedBlocks(),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
      ],
      (expectedBlocks, flagTensor) => {
        flagTensor.load(this.growthTo.flagBuffer);
        for (const [tensorPos, block] of expectedBlocks) {
          const flags = unpackFarmingFlags(flagTensor.get(...tensorPos));
          let remove = flags.removeWhenDestroyed || destroyAllBlocks;
          // Always replace soil with dirt
          const blockToChange =
            block === getTerrainID("soil") ? getTerrainID("dirt") : block;
          // Never remove dirt.
          remove = remove && blockToChange !== getTerrainID("dirt");
          if (remove) {
            // Destroy the block
            terrainModifier.setTensorPos(tensorPos, 0, 0, 0, 0, 0);
          } else {
            // Relinquish (keep, but remove farming data) the block
            // (This keeps moisture and growth around, though)
            terrainModifier.setTensorPos(tensorPos, blockToChange, 0);
          }
        }
      }
    );
  }

  private updateGrowthAndMoisture(
    terrainModifier: FarmingPlantTerrainModifier,
    newProgress: number,
    waterLevel: number
  ) {
    // For now, just make all blocks progress uniformly.
    // Can eventually make each block progress from the time they were placed
    usingAll(
      [
        terrainModifier.expectedBlocks(),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
      ],
      (expectedBlocks, flagTensor) => {
        flagTensor.load(this.growthTo.flagBuffer);
        for (const [tensorPos, block] of expectedBlocks) {
          const flags = unpackFarmingFlags(flagTensor.get(...tensorPos));
          const growth = flags.writeGrowthProgress
            ? growthStageForProgress(
                block,
                lerp(flags.startProgress, flags.endProgress, newProgress)
              )
            : 0;
          terrainModifier.setTensorPos(
            tensorPos,
            terrainModifier.getTensorPos(tensorPos)?.block || 0,
            undefined,
            growth,
            moistureForWaterLevel(waterLevel)
          );
        }
      }
    );
  }

  private addBlocks(terrainModifier: FarmingPlantTerrainModifier, num: number) {
    if (num <= 0) {
      return;
    }
    // look for any diffs we can apply, and apply up to num.
    const blocksToAdd = new SparseSet3(terrainModifier.tensorShape);
    usingAll(
      [
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
      ],
      (diffShapeTensor, diffBlockTensor, shapeTensor, blockTensor) => {
        diffShapeTensor.load(this.growthDiff.shapeBuffer);
        diffBlockTensor.load(this.growthDiff.blockBuffer);
        shapeTensor.load(this.growthTo.shapeBuffer);
        blockTensor.load(this.growthTo.blockBuffer);

        // Do shape diffs without block diffs first
        for (const [tensorPos] of diffShapeTensor) {
          const pos = farmTensorToWorld(
            tensorPos,
            terrainModifier.tensorAnchor
          );
          const targetBlock = blockTensor.get(...tensorPos);
          const targetShape = shapeTensor.get(...tensorPos) ?? 0;

          if (
            terrainModifier.canModify(pos) &&
            targetBlock === terrainModifier.get(pos)?.block &&
            (terrainModifier.get(pos)?.shape ?? 0) !== targetShape
          ) {
            blocksToAdd.set(tensorPos);
          }
        }
        // Then do all block diffs
        for (const [tensorPos] of diffBlockTensor) {
          const pos = farmTensorToWorld(
            tensorPos,
            terrainModifier.tensorAnchor
          );
          const block = blockTensor.get(...tensorPos);
          if (
            terrainModifier.canModify(pos) &&
            terrainModifier.get(pos)?.block !== undefined &&
            terrainModifier.get(pos)?.block !== block
          ) {
            blocksToAdd.set(tensorPos);
          }
        }
      }
    );

    let added = 0;
    usingAll(
      [
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
        Tensor.make(this.voxeloo, terrainModifier.tensorShape, "U32"),
      ],
      (blockTensor, shapeTensor, flagTensor) => {
        blockTensor.load(this.growthTo.blockBuffer);
        shapeTensor.load(this.growthTo.shapeBuffer);
        flagTensor.load(this.growthTo.flagBuffer);
        for (const tensorPos of blocksToAdd) {
          if (added >= num) {
            break;
          }
          const worldPos = farmTensorToWorld(
            tensorPos,
            terrainModifier.tensorAnchor
          );

          // We can add this block if either itself or a direct neighbor
          // exists in the world.
          const posToCheck = [
            worldPos,
            add(worldPos, [1, 0, 0]),
            add(worldPos, [-1, 0, 0]),
            add(worldPos, [0, 1, 0]),
            add(worldPos, [0, -1, 0]),
            add(worldPos, [0, 0, 1]),
            add(worldPos, [0, 0, -1]),
          ];
          if (!terrainModifier.canModify(worldPos)) {
            // Can't modify this position, continue
            continue;
          }
          let canAdd = false;
          for (const neighborPos of posToCheck) {
            const neighbor = terrainModifier.get(neighborPos);
            // Add if the block has a neighbor in the world that's owned
            canAdd =
              canAdd ||
              (!!neighbor?.block &&
                neighbor?.farming === terrainModifier.entity.id);
          }
          if (canAdd) {
            const flags = unpackFarmingFlags(flagTensor.get(...tensorPos));
            const block = blockTensor.get(...tensorPos);
            const growth = flags.writeGrowthProgress
              ? growthStageForProgress(block, flags.startProgress)
              : undefined;
            if (
              terrainModifier.set(
                worldPos,
                block,
                block ? undefined : 0,
                growth,
                0,
                shapeTensor.get(...tensorPos) ?? 0
              )
            ) {
              added += 1;
            }
          }
        }
      }
    );
    terrainModifier.apply();
    if (added > 0 && added < num) {
      // Try again if we have new supports added
      this.addBlocks(terrainModifier, num - added);
    }
  }
}
