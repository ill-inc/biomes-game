import { loadBikkieForScript } from "@/../scripts/node/helpers/bikkie";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { getBiscuits } from "@/shared/bikkie/active";
import { anItem } from "@/shared/game/item";
import { BiomesId } from "@/shared/ids";
import { MultiMap } from "@/shared/util/collections";

export async function checkUnusedTriggers() {
  await bootstrapGlobalSecrets();
  await loadBikkieForScript();

  const biscuits = getBiscuits();
  const terrainToBikkieId = new MultiMap<string, BiomesId>();

  // Terrain names must be unique
  for (const biscuit of biscuits) {
    if (biscuit.terrainName) {
      terrainToBikkieId.add(biscuit.terrainName, biscuit.id);
    }
  }

  for (const [terrainName, ids] of terrainToBikkieId) {
    if (ids.length > 1) {
      console.log(
        `Terrain ${terrainName} used by ${ids.length} bikkies`,
        ids.map((e) => e.toString()).join(", "),
        ids.map((e) => anItem(e).displayName)
      );
    }
  }
}

checkUnusedTriggers();
