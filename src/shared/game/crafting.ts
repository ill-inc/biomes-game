import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { Item } from "@/shared/ecs/gen/types";
import { countOf } from "@/shared/game/items";
import { getBagSpecHash } from "@/shared/game/recipes";
import type { BiomesId } from "@/shared/ids";
import { DefaultMap } from "@/shared/util/collections";

export interface CraftingContext {
  recipe: Item;
  stationItem?: Item;
  stationEntityId?: BiomesId;
}

export function craftingTimeMs(context: CraftingContext): number {
  let penalty = 1.0;
  if (!context.stationItem) {
    penalty = 2.0;
  }

  return penalty * (context.recipe.craftingDurationMs ?? 1000);
}

export const recipesMap = bikkieDerived("recipesMap", () => {
  const recipes = getBiscuits("/recipes");
  const map = new DefaultMap<string, BiomesId[]>(() => []);
  for (const recipe of recipes) {
    const hash = getBagSpecHash(recipe.input);
    if (hash) {
      map.get(hash).push(recipe.id);
    }
  }
  return map;
});

export function calculateCraftingStationRoyalty(
  userId: BiomesId,
  ownerId: BiomesId | undefined,
  stationItem: Item | undefined
) {
  if (!stationItem) {
    return undefined;
  }

  if (userId === ownerId) {
    return undefined;
  }
  return countOf(BikkieIds.bling, 1n);
}
