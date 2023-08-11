import { safeGetTerrainId } from "@/shared/asset_defs/terrain";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import type { Item } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import { compactMap } from "@/shared/util/collections";
import { ok } from "assert";

const terrainIdToBiscuit = bikkieDerived(
  "terrainIdToBiscuit",
  () =>
    new Map(
      compactMap(getBiscuits("/blocks"), (b) => {
        const id = safeGetTerrainId(b.terrainName);
        return id ? [id, anItem(b.id)] : undefined;
      })
    )
);

export function terrainIdToBlock(terrainId?: number): Item | undefined {
  return terrainId ? terrainIdToBiscuit().get(terrainId) : undefined;
}

export function terrainIdToBlockOrDie(terrainId?: number): Item {
  const block = terrainIdToBlock(terrainId);
  ok(block !== undefined, `No block for terrainID ${terrainId}`);
  return block;
}
