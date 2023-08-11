import type { TerrainID } from "@/shared/asset_defs/terrain";
import { getTerrainID, terrainIDs } from "@/shared/asset_defs/terrain";
import { makeDisposable } from "@/shared/disposable";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { VoxelIdSet } from "@/shared/wasm/types/mapping";

export const MAX_ZOOM_LEVEL = 6;
export const ZOOM_LEVELS = MAX_ZOOM_LEVEL + 1;

const INCLUDED_BLOCK_IDS = [...terrainIDs];
const INCLUDED_FLORA_IDS = [
  getTerrainID("oak_leaf"),
  getTerrainID("birch_leaf"),
  getTerrainID("rubber_leaf"),
  getTerrainID("sakura_leaf"),
];

export interface MapConfig {
  floraFilter: VoxelIdSet;
  blockFilter: VoxelIdSet;
}

function createVoxelIdSet(voxeloo: VoxelooModule, ids: TerrainID[]) {
  const ret = new voxeloo.VoxelIdSet();
  for (const id of ids) {
    ret.add(id);
  }
  return ret;
}

export function genConfig({ voxeloo }: { voxeloo: VoxelooModule }) {
  const blockFilter = createVoxelIdSet(voxeloo, INCLUDED_BLOCK_IDS);
  const floraFilter = createVoxelIdSet(voxeloo, INCLUDED_FLORA_IDS);
  return makeDisposable({ blockFilter, floraFilter }, () => {
    floraFilter.delete();
    blockFilter.delete();
  });
}
