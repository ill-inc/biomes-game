import type { TerrainID } from "@/shared/asset_defs/terrain";
import { usingAll } from "@/shared/deletable";
import type { Vec3i } from "@/shared/ecs/gen/types";
import { fromBlockId, fromFloraId } from "@/shared/game/ids";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { add, distManhattan, mul, sub } from "@/shared/math/linear";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import {
  isBlockGroupEntry,
  isFloraGroupEntry,
} from "@/shared/wasm/types/galois";
import { ok } from "assert";
import type { GaiaReplica } from "@/server/gaia_v2/table";
export const VOLUME_TENSOR_SHAPE: Vec3i = [32, 32, 32];
export const VOLUME_TENSOR_ROOT: Vec3i = [16, 1, 16];
export const VOLUME_TENSOR_ANCHOR: Vec3i = mul(-1, VOLUME_TENSOR_ROOT);

export type FarmingFlags = {
  required: boolean;
  dropBlock: boolean;
  writeGrowthProgress: boolean;
  removeWhenDestroyed: boolean;
  startProgress: number;
  endProgress: number;
};

export type FarmingFlagsOptions = Partial<FarmingFlags>;

function farmingFlagsFromOptions(options?: FarmingFlagsOptions): FarmingFlags {
  // Defaults
  return {
    required: options?.required ?? false,
    dropBlock: options?.dropBlock ?? true,
    writeGrowthProgress: options?.writeGrowthProgress ?? true,
    removeWhenDestroyed: options?.removeWhenDestroyed ?? true,
    startProgress: options?.startProgress ?? 0,
    endProgress: options?.endProgress ?? 1,
  };
}

export const unpackFarmingFlags = (flags: number): FarmingFlags => {
  return {
    required: (flags & 1) !== 0,
    dropBlock: (flags & 2) !== 0,
    writeGrowthProgress: (flags & 4) !== 0,
    removeWhenDestroyed: (flags & 8) !== 0,
    startProgress: ((flags & 0x0000ff00) >> 8) / 100.0,
    endProgress: ((flags & 0x00ff0000) >> 16) / 100.0,
  };
};

export const packFarmingFlags = (flags: FarmingFlags): number => {
  return (
    (flags.required ? 1 : 0) |
    (flags.dropBlock ? 2 : 0) |
    (flags.writeGrowthProgress ? 4 : 0) |
    (flags.removeWhenDestroyed ? 8 : 0) |
    (Math.floor(flags.startProgress * 100) << 8) |
    (Math.floor(flags.endProgress * 100) << 16)
  );
};

// Where the local space of [0,0,0] maps to in the tensor.
// This allows us to grow in any direction in x,z, and grow up in y.
export type GrowthStage = {
  blockBuffer: Uint8Array;
  shapeBuffer?: Uint8Array;
  flagBuffer?: Uint8Array;
};

export type GrowthBlockEntry = [
  Vec3i,
  { block: TerrainID; shape?: number; flags?: FarmingFlagsOptions }
];
export type GrowthBlockList = GrowthBlockEntry[];

export function plantGrowthStage(
  voxeloo: VoxelooModule,
  volume: GrowthBlockList
): GrowthStage {
  let blockBuffer: Uint8Array | undefined;
  let shapeBuffer: Uint8Array | undefined;
  let flagBuffer: Uint8Array | undefined;
  usingAll(
    [
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
    ],
    (blockTensor, shapeTensor, flagTensor) => {
      const blockUpdate = new TensorUpdate(blockTensor);
      const shapeUpdate = new TensorUpdate(shapeTensor);
      const flagUpdate = new TensorUpdate(flagTensor);
      for (const [localPos, { block, shape, flags }] of volume) {
        const tensorPos = add(VOLUME_TENSOR_ROOT, localPos);
        blockUpdate.set(tensorPos, block);
        if (shape !== undefined) {
          shapeUpdate.set(tensorPos, shape);
        }
        if (flags !== undefined) {
          flagUpdate.set(
            tensorPos,
            packFarmingFlags(farmingFlagsFromOptions(flags))
          );
        }
      }
      blockUpdate.apply();
      shapeUpdate.apply();
      flagUpdate.apply();

      blockBuffer = blockTensor.save();
      shapeBuffer = shapeTensor.save();
      flagBuffer = flagTensor.save();
    }
  );
  ok(blockBuffer);
  return {
    blockBuffer,
    shapeBuffer,
    flagBuffer,
  };
}

export function plantGrowthStageFromGroup(
  voxeloo: VoxelooModule,
  table: GaiaReplica["table"],
  groupId: BiomesId | number,
  groupAnchor?: Vec3i,
  flagsOptions?: FarmingFlagsOptions
): GrowthStage {
  const group = table.get(groupId as BiomesId);
  const groupBlob = group?.group_component?.tensor;
  if (!groupBlob) {
    // Don't be noisy on dev since it's very likely we haven't loaded
    // all entities. TODO: store group tensor directly instead
    log.prodError(`Farming could not find group ${groupId}`);
  }
  return plantGrowthStageFromGroupBlob(
    voxeloo,
    groupBlob,
    groupAnchor,
    flagsOptions
  );
}

export function plantGrowthStageFromGroupBlob(
  voxeloo: VoxelooModule,
  groupBlob?: string,
  groupAnchor?: Vec3i,
  flagsOptions?: FarmingFlagsOptions
): GrowthStage {
  // Default group flags
  const flags = farmingFlagsFromOptions(flagsOptions);
  const packedFlags = packFarmingFlags(flags);
  let blockBuffer: Uint8Array | undefined;
  let shapeBuffer: Uint8Array | undefined;
  let flagBuffer: Uint8Array | undefined;
  usingAll(
    [
      new voxeloo.GroupTensor(),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
      Tensor.make(voxeloo, VOLUME_TENSOR_SHAPE, "U32"),
    ],
    (groupTensor, blobTensor, shapeTensor, flagTensor) => {
      if (groupBlob) {
        groupTensor.load(groupBlob);
      }
      if (!groupAnchor) {
        // If no group anchor is defined, find the center of the bottom-most
        // voxel layer. That will be our anchor point that grows directly
        // above tilled soil.
        const lowestLayer: Vec3i[] = [];
        groupTensor.scan((pos) => {
          if (lowestLayer.length === 0 || pos[1] === lowestLayer[0][1]) {
            lowestLayer.push(pos);
          } else if (pos[1] < lowestLayer[0][1]) {
            lowestLayer.length = 0;
            lowestLayer.push(pos);
          }
        });
        // Group anchor is the closest point to the center of the lowest layer
        // that exists.
        const lowestCenter = mul(
          1 / lowestLayer.length,
          lowestLayer.reduce((acc, pos) => add(acc, pos), [0, 0, 0])
        );
        lowestLayer.sort((a, b) => {
          const aDist = distManhattan(a, lowestCenter);
          const bDist = distManhattan(b, lowestCenter);
          if (aDist < bDist) {
            return -1;
          } else if (aDist > bDist) {
            return 1;
          } else {
            return 0;
          }
        });
        groupAnchor = lowestLayer.length > 0 ? lowestLayer[0] : [0, 0, 0];
      }
      // Fill in the group
      const blockUpdate = new TensorUpdate(blobTensor);
      const shapeUpdate = new TensorUpdate(shapeTensor);
      const flagUpdate = new TensorUpdate(flagTensor);
      groupTensor.scan((groupPos, entry) => {
        const pos = add(sub(groupPos, groupAnchor!), VOLUME_TENSOR_ROOT);
        ok(
          pos[0] >= 0 &&
            pos[1] >= 0 &&
            pos[2] >= 0 &&
            pos[0] < VOLUME_TENSOR_SHAPE[0] &&
            pos[1] < VOLUME_TENSOR_SHAPE[1] &&
            pos[2] < VOLUME_TENSOR_SHAPE[2],
          `Farming group ${groupBlob} is too large`
        );
        if (isBlockGroupEntry(entry)) {
          blockUpdate.set(pos, fromBlockId(entry.block.block_id));
          shapeUpdate.set(pos, entry.block.isomorphism_id);
        } else if (isFloraGroupEntry(entry)) {
          blockUpdate.set(pos, fromFloraId(entry.flora.flora_id));
        }
        flagUpdate.set(pos, packedFlags);
      });
      blockUpdate.apply();
      shapeUpdate.apply();
      flagUpdate.apply();
      blockBuffer = blobTensor.save();
      shapeBuffer = shapeTensor.save();
      flagBuffer = flagTensor.save();
    }
  );
  ok(blockBuffer);
  return {
    blockBuffer,
    shapeBuffer,
    flagBuffer,
  };
}

export function plantGrowthStageSimple(
  voxeloo: VoxelooModule,
  block: TerrainID,
  shape?: number,
  flagsOptions?: FarmingFlagsOptions
): GrowthStage {
  const flags = farmingFlagsFromOptions(flagsOptions);
  return plantGrowthStage(voxeloo, [[[0, 0, 0], { block, shape, flags }]]);
}

export function plantGrowthStageLog(
  voxeloo: VoxelooModule,
  log: TerrainID,
  leaf: TerrainID,
  numLogs: number,
  logShape?: number,
  flagsOptions?: FarmingFlagsOptions
): GrowthStage {
  const flags = farmingFlagsFromOptions(flagsOptions);
  const logBlocks: GrowthBlockList = [...Array(numLogs).keys()].map((i) => [
    [0, i, 0],
    { block: log, shape: logShape, flags },
  ]);
  const leafBlock: GrowthBlockEntry = [[0, numLogs, 0], { block: leaf, flags }];
  return plantGrowthStage(voxeloo, [...logBlocks, leafBlock]);
}
