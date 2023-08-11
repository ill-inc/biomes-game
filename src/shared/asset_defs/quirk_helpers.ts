import type { TerrainID } from "@/shared/asset_defs/terrain";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { isBlockId, isGlassId } from "@/shared/game/ids";

export function terrainCollides(id: TerrainID): boolean {
  if (isBlockId(id) || isGlassId(id)) {
    return true;
  }

  const biscuit = terrainIdToBlock(id);
  return !!biscuit?.isCollidable;
}

export function terrainEnduring(id: TerrainID): boolean {
  const biscuit = terrainIdToBlock(id);
  return !!biscuit?.isEnduring;
}

export function terrainLifetime(id: TerrainID): number | undefined {
  const biscuit = terrainIdToBlock(id);
  return biscuit?.lifetime;
}

export function terrainDyeable(id: TerrainID): boolean {
  const biscuit = terrainIdToBlock(id);
  return !!biscuit?.isDyeable;
}

export function terrainEmissive(id: TerrainID): boolean {
  const biscuit = terrainIdToBlock(id);
  return !!biscuit?.isEmissive;
}

export function terrainShapeable(id: TerrainID): boolean {
  return isBlockId(id) || isGlassId(id);
}
