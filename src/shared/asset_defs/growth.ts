import type { TerrainID } from "@/shared/asset_defs/terrain";
// Growth is a uint8:
// 2 bits: unused
// 1 bit: dead
// 1 bit: wilted
// 4 bits: intermediate stage

// Fill these out with the expected growth tensor values for a given progress
// number. Progress is [0,1].
export function growthStageForProgress(
  _block: TerrainID,
  progress: number
): number {
  return 1 + Math.floor(Math.ceil(100 * progress) / 33);
}

// Wilt and death states should probably not be a function of progress, but can
// fall back when undefined
export function growthDeath(_block: TerrainID, stage: number): number {
  return stage | 0x10;
}

export function growthWilt(_block: TerrainID, stage: number): number {
  return stage | 0x10;
}
