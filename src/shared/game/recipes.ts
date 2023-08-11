import type {
  InventoryAssignmentPattern,
  ItemBag,
} from "@/shared/ecs/gen/types";
import type { BagSpec } from "@/shared/game/bag_spec";
import type { Item } from "@/shared/game/item";
import { bagSpecToBag, createBag } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";

export function getRecipeInput(recipe: Item): ItemBag {
  return bagSpecToBag(recipe.input) ?? createBag();
}

export function getRecipeOutput(recipe: Item): ItemBag {
  return bagSpecToBag(recipe.output) ?? createBag();
}

export function getBagSpecHash(spec?: BagSpec): string | undefined {
  if (!spec?.length) {
    return;
  }
  const sorted = [...spec].sort((a, b) => a[0] - b[0]);
  return JSON.stringify(sorted);
}

export function patternAsBagSpec(
  pattern?: InventoryAssignmentPattern
): BagSpec | undefined {
  if (!pattern) {
    return undefined;
  }
  const map = new Map<BiomesId, number>();
  for (const [_, { item, count }] of pattern) {
    const num = Number(count);
    // Combine counts for the same item ID.
    map.set(item.id, (map.get(item.id) ?? 0) + num);
  }
  return [...map.entries()];
}
