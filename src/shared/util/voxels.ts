import type { TerrainID } from "@/shared/asset_defs/terrain";
import { scanGroupTensor, terrainIdForTensorEntry } from "@/shared/game/group";
import type { GroupTensor } from "@/shared/wasm/types/galois";

export function groupTensorValueCounts(tensor: GroupTensor) {
  const map = new Map<TerrainID, number>();
  for (const { tensorEntry } of scanGroupTensor(tensor)) {
    const tensorTerrainId = terrainIdForTensorEntry(tensorEntry);
    map.set(tensorTerrainId, 1 + (map.get(tensorTerrainId) || 0));
  }
  return map;
}
