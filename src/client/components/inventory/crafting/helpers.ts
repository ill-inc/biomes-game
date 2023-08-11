import {
  getOwnedItems,
  getRecipeAttribute,
  getRecipeMap,
  recipeDisplayName,
} from "@/client/components/inventory/helpers";
import { getRecipeIconURL } from "@/client/components/inventory/icons";
import type { ClientContextSubset } from "@/client/game/context";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import { BikkieIds } from "@/shared/bikkie/ids";
import type {
  ReadonlyInventory,
  ReadonlyRecipeBook,
  ReadonlyWearing,
} from "@/shared/ecs/gen/components";
import { InventoryCraftEvent } from "@/shared/ecs/gen/events";
import type { Item, ItemAndCount, ItemBag } from "@/shared/ecs/gen/types";
import type { CraftingContext } from "@/shared/game/crafting";
import { craftingTimeMs } from "@/shared/game/crafting";
import {
  determineGivePattern,
  determineTakePattern,
} from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import { countTypesInBag, itemPk } from "@/shared/game/items";
import { getRecipeInput, getRecipeOutput } from "@/shared/game/recipes";
import type { BiomesId } from "@/shared/ids";
import { sleep } from "@/shared/util/async";
import { ok } from "assert";
import { flatMap } from "lodash";
import { useMemo } from "react";

export type RecipeCategory = ReturnType<typeof getRecipeCategory>;

export interface CraftingBundle {
  id: BiomesId;
  item: Item;
  name: string;
  detailCategory: RecipeCategory;
  itemCategory: string;
  iconURL: string;

  ingredients: ItemBag;
  output: ItemBag;
  outputHash: string;

  canCraft: boolean;
  cannotCraftReason?: string;
  blingCost: number;
  totalRequiredItems: number;

  craftWith: BiomesId[];

  alternatives: Array<{
    name: string;
    recipe: Item;
  }>;
}

export function stationOk(recipe: Item, atCraftingStationItem?: Item) {
  const craftWith = recipe.craftWith ?? [];
  if (atCraftingStationItem) {
    return (
      craftWith.includes(atCraftingStationItem.id) ||
      (craftWith.length === 0 &&
        !!atCraftingStationItem.stationSupportsHandcraft)
    );
  }
  return craftWith.length === 0;
}

function getRecipeCategory(recipe: Item) {
  if (getRecipeAttribute(recipe, "wearAsHat")) {
    return "Hats";
  } else if (getRecipeAttribute(recipe, "wearAsOuterwear")) {
    return "Outerwear";
  } else if (getRecipeAttribute(recipe, "wearAsTop")) {
    return "Top";
  } else if (getRecipeAttribute(recipe, "wearAsBottoms")) {
    return "Bottoms";
  } else if (getRecipeAttribute(recipe, "wearOnFeet")) {
    return "Feet";
  } else if (getRecipeAttribute(recipe, "wearAsHair")) {
    return "Hair";
  } else if (getRecipeAttribute(recipe, "wearOnFace")) {
    return "Face";
  } else if (getRecipeAttribute(recipe, "wearOnEars")) {
    return "Ears";
  } else if (getRecipeAttribute(recipe, "wearOnNeck")) {
    return "Neck";
  } else if (getRecipeAttribute(recipe, "wearOnHands")) {
    return "Hands";
  } else if (getRecipeAttribute(recipe, "isHead")) {
    return "Head";
  } else if (getRecipeAttribute(recipe, "wearOnFace")) {
    return "Facial Hair";
  } else if (getRecipeAttribute(recipe, "lifetimeDurabilityMs")) {
    return "Tools";
  } else {
    return "Materials";
  }
}

function getCannotCraftReason(
  inventory: ReadonlyInventory,
  wearing: ReadonlyWearing,
  ingredients: ItemBag,
  recipe: Item,
  atCraftingStationItem?: Item
): string | undefined {
  if (!stationOk(recipe, atCraftingStationItem)) {
    return "You are not at the correct crafting station";
  } else if (
    !determineTakePattern({ inventory, wearing }, ingredients, {
      allowTypeMatch: true,
      respectPayload: false,
    })
  ) {
    return "Missing ingredients";
  } else if (
    !determineGivePattern({ inventory, wearing }, getRecipeOutput(recipe)!)
  ) {
    return "Your inventory is full";
  }
  return undefined;
}

function getRecipeAlternatives(recipeBook: ReadonlyRecipeBook, recipe: Item) {
  const recipeMap = getRecipeMap(recipeBook);
  const outputs = getRecipeOutput(recipe);
  const alts = flatMap(outputs ? [...outputs.values()] : [], (output) =>
    ((recipeMap && recipeMap[output.item.id]) || []).filter(
      (e) => e.id !== recipe.id
    )
  );
  // Map into {name, recipe} by labeling with any inputs not found in this one
  // TODO: consider explicitly setting this in Bikkie
  const nameByDiff = (baseRecipe: Item, recipe: Item) => {
    const inputs = getRecipeInput(baseRecipe);
    const altInputs = getRecipeInput(recipe);
    const missing =
      altInputs && inputs
        ? [...altInputs.values()].filter((e) => !inputs.has(itemPk(e.item)))
        : [];
    return missing.length > 0
      ? missing.map((itemCt) => itemCt.item.displayName).join(" ,")
      : recipeDisplayName(recipe);
  };
  const altsWithNames = alts.map((altRecipe) => {
    return {
      name: nameByDiff(recipe, altRecipe),
      recipe: altRecipe,
    };
  });
  // Put our own recipe in the list, with a name diffed from the first alt
  const curName =
    alts.length > 0 ? nameByDiff(alts[0], recipe) : recipeDisplayName(recipe);
  return [{ name: curName, recipe: recipe }, ...altsWithNames];
}

export function useCraftingBundle(
  reactResources: ClientReactResources,
  userId: BiomesId,
  recipeId: BiomesId,
  atCraftingStationItem?: Item
) {
  return useMemo(
    () =>
      getCraftingBundle(
        reactResources,
        userId,
        recipeId,
        atCraftingStationItem
      ),
    [
      recipeId,
      atCraftingStationItem,
      reactResources.version("/ecs/c/inventory", userId),
      reactResources.version("/ecs/c/wearing", userId),
    ]
  );
}

export function getCraftingBundle(
  resources: ClientResources | ClientReactResources,
  userId: BiomesId,
  recipeId: BiomesId,
  atCraftingStationItem?: Item
): CraftingBundle {
  const inventory = resources.get("/ecs/c/inventory", userId);
  const wearing = resources.get("/ecs/c/wearing", userId);
  const recipeBook = resources.get("/ecs/c/recipe_book", userId);
  const recipe = anItem(recipeId);

  ok(inventory && wearing && recipeBook);

  const recipeInput = getRecipeInput(recipe);
  const recipeOutput = getRecipeOutput(recipe);

  // Combine by output hash: joined item ids
  const sortedKeys = [...recipeOutput.keys()];
  sortedKeys.sort();
  const groupHash = sortedKeys
    .map((key) => {
      const itemCt = recipeOutput.get(key);
      if (!itemCt) {
        return "";
      }
      return `${itemCt.item.id}`;
    })
    .join(",");

  const craftWith = recipe.craftWith ?? [];

  const cannotCraftReason = getCannotCraftReason(
    inventory,
    wearing,
    recipeInput,
    recipe,
    atCraftingStationItem
  );

  const firstItem = recipeOutput.values().next().value?.item;
  const cat = firstItem ? firstItem.craftingCategory : "Unknown";
  const blingCost = countTypesInBag(recipeInput, BikkieIds.bling);
  const totalRequiredItems = countTypesInBag(
    recipeInput,
    undefined,
    (_) => true
  );

  return {
    id: recipeId,
    item: recipe,
    name: recipeDisplayName(recipe),
    detailCategory: getRecipeCategory(recipe),
    itemCategory: cat,
    iconURL: getRecipeIconURL(recipe),

    ingredients: recipeInput,
    output: recipeOutput,
    outputHash: groupHash,

    alternatives: getRecipeAlternatives(recipeBook, recipe),

    craftWith,
    blingCost,
    totalRequiredItems,

    canCraft: !cannotCraftReason,
    cannotCraftReason: cannotCraftReason,
  };
}

export function ingredientCountRender(items: ItemAndCount) {
  return Number(items.count);
}

export async function performCraft(
  deps: ClientContextSubset<"events" | "resources" | "userId">,
  context: CraftingContext,
  abortController?: AbortController
) {
  if (abortController?.signal.aborted) {
    return;
  }
  const ownedItems = getOwnedItems(deps.resources, deps.userId);
  const pattern = determineTakePattern(
    ownedItems,
    getRecipeInput(context.recipe)!,
    {
      allowTypeMatch: true,
      respectPayload: false,
    }
  );

  if (!pattern) {
    throw new Error("Missing ingredients");
  }

  // Simulate the crafting delay
  await sleep(craftingTimeMs(context));

  if (!abortController?.signal.aborted) {
    await deps.events.publish(
      new InventoryCraftEvent({
        id: deps.userId,
        recipe: context.recipe,
        slot_refs: pattern.map((e) => e[0]),
        stationEntityId: context.stationEntityId,
      })
    );
  }
}
