import { makeEventHandler, RollbackError } from "@/server/logic/events/core";
import { itemSetContains } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import { getRecipeInput, getRecipeOutput } from "@/shared/game/recipes";
import { log } from "@/shared/logging";

import { BikkieIds } from "@/shared/bikkie/ids";
import type { ItemAndCount, ItemBag } from "@/shared/ecs/gen/types";
import type { BagSpec } from "@/shared/game/bag_spec";
import {
  calculateCraftingStationRoyalty,
  recipesMap,
} from "@/shared/game/crafting";
import { anItem } from "@/shared/game/item";
import {
  countOf,
  createBag,
  getItemTypeId,
  isDroppableItem,
} from "@/shared/game/items";
import { getBagSpecHash, patternAsBagSpec } from "@/shared/game/recipes";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { chooseAllPossibilities } from "@/shared/util/collections";
import { ok } from "assert";
import { sample } from "lodash";

import type { Player } from "@/server/logic/events/player";
import { q } from "@/server/logic/events/query";
import {
  addToBag,
  bagSpecToBag,
  isCompostableItem,
  itemCountToApproximateNumber,
} from "@/shared/game/items";
import { relevantBiscuitForEntity } from "@/shared/npc/bikkie";

const BLING_PER_COMPOST = 0.1;
const COMPOST_FOR_SUPER_FERTILIZER = 6;

function maybePayRoyalties(
  amount: ItemAndCount | undefined,
  usingUser: Player,
  ownerUser: Player | undefined
) {
  if (!amount) {
    return;
  }

  usingUser.inventory.takeOrThrow(createBag(amount));
  if (ownerUser) {
    ownerUser.inventory.giveOrThrow(createBag(amount));
  }
}

const inventoryCraftEventHandler = makeEventHandler("inventoryCraftEvent", {
  prepareInvolves: (event) => ({
    station: q.optional(event.stationEntityId),
  }),
  prepare: ({ station }) => ({
    stationOwnerId: station?.created_by?.id,
  }),
  involves: (event, { stationOwnerId }) => ({
    player: q.player(event.id),
    station: q.optional(event.stationEntityId),
    stationOwner: q.player(stationOwnerId ?? INVALID_BIOMES_ID).optional(),
  }),
  apply: ({ player, station, stationOwner }, event, context) => {
    if (!itemSetContains(player.delta().recipeBook()?.recipes, event.recipe)) {
      log.warn("Player tried to craft recipe they haven't unlocked", {
        event,
      });
      return;
    }

    const stationItem = relevantBiscuitForEntity(station?.asReadonlyEntity());
    const royalties = calculateCraftingStationRoyalty(
      player.id,
      stationOwner?.id,
      stationItem
    );

    const input = getRecipeInput(event.recipe);
    if (!input || input.size === 0) {
      throw new RollbackError("Recipe doesn't require anything");
    }
    const output = getRecipeOutput(event.recipe);
    if (!output || output.size === 0) {
      throw new RollbackError("Recipe doesn't produce anything");
    }

    maybePayRoyalties(royalties, player, stationOwner);

    player.inventory.takeOrThrow(input, {
      allowTypeMatch: true,
      respectPayload: false,
    });
    player.inventory.giveOrThrow(output);

    context.publish({
      kind: "craft",
      entityId: player.id,
      bag: itemBagToString(output),
      station: stationItem?.id,
      stationEntityId: station?.id,
      royaltyTo: stationOwner?.id,
      royaltyAmount: royalties?.count,
    });
  },
});

const inventoryCookEventHandler = makeEventHandler("inventoryCookEvent", {
  prepareInvolves: (event) => ({
    station: q.optional(event.stationEntityId),
  }),
  prepare: ({ station }) => ({
    stationOwnerId: station?.created_by?.id,
  }),
  involves: (event, { stationOwnerId }) => ({
    player: q.player(event.id),
    station: q.optional(event.stationEntityId),
    stationOwner: q.player(stationOwnerId ?? INVALID_BIOMES_ID).optional(),
  }),
  apply: ({ player, station, stationOwner }, event, context) => {
    if (event.src.length < 3) {
      log.warn("Need at least three items to cook.");
      return;
    }

    for (const [_, { item }] of event.src) {
      if (!isDroppableItem(item)) {
        log.warn("Can't cook soul bound items!");
        return;
      }
    }

    const stationItem = relevantBiscuitForEntity(station?.asReadonlyEntity());
    ok(stationItem, "Must be at a station for cookin'");
    player.inventory.take(event.src);

    const findRecipes = (spec?: BagSpec) => {
      const hash = getBagSpecHash(spec);
      if (!hash) {
        return;
      }
      const candidateRecipes = recipesMap().peek(hash);
      // Only select recipes that can be crafted at the station.
      return candidateRecipes?.filter((id) =>
        anItem(id).craftWith?.includes(stationItem?.id)
      );
    };

    // Go from most specific to least specific item types.
    const specificItems = patternAsBagSpec(event.src);
    const genericItems: BagSpec | undefined = specificItems?.map(
      ([id, count]) => [getItemTypeId(anItem(id)), count]
    );
    ok(specificItems && genericItems);

    let recipes: BiomesId[] | undefined;
    for (const input of chooseAllPossibilities(specificItems, genericItems)) {
      recipes = findRecipes(input);
      if (recipes?.length) {
        break;
      }
    }

    if (!recipes?.length) {
      // Otherwise try to find a recipe with type IDs instead:
      // e.g. a recipe that calls for any type of vegetable instead of carrots specifically.
      // Maybe in the future we could also try partially generic ingredients as well...

      recipes = findRecipes(genericItems);
    }

    let output: ItemBag | undefined;
    if (recipes?.length) {
      // If there are multiple recipes matching our ingredients, pick one randomly.
      const recipe = sample(recipes)!;
      output = getRecipeOutput(anItem(recipe));
    }

    if (!output) {
      // If no recipe matches or output is none, then just produce slop.
      output = createBag(countOf(BikkieIds.slop));
    }

    const royalties = calculateCraftingStationRoyalty(
      player.id,
      stationOwner?.id,
      stationItem
    );
    maybePayRoyalties(royalties, player, stationOwner);
    player.inventory.giveOrThrow(output);

    context.publish({
      kind: "craft",
      entityId: player.id,
      bag: itemBagToString(output),
      station: stationItem?.id,
      stationEntityId: station?.id,
      royaltyTo: stationOwner?.id,
      royaltyAmount: royalties?.count,
    });
  },
});

// Composting differs from cooking in that it has separate programmatic behavior
const inventoryCompostEventHandler = makeEventHandler("inventoryCompostEvent", {
  prepareInvolves: (event) => ({
    station: q.optional(event.stationEntityId),
  }),
  prepare: ({ station }) => ({
    stationOwnerId: station?.created_by?.id,
  }),
  involves: (event, { stationOwnerId }) => ({
    player: q.player(event.id),
    station: q.optional(event.stationEntityId),
    stationOwner: q.player(stationOwnerId ?? INVALID_BIOMES_ID).optional(),
  }),
  apply: ({ player, station, stationOwner }, event, context) => {
    const stationItem = relevantBiscuitForEntity(station?.asReadonlyEntity());
    ok(stationItem, "Must be at a station for cookin'");

    if (event.src.length < 1) {
      log.warn("Need at least one item to compost.");
      return;
    }

    for (const [_, { item }] of event.src) {
      if (!isDroppableItem(item)) {
        log.warn("Can't compost soul bound items!");
        return;
      }
    }

    const bagSpec = patternAsBagSpec(event.src);
    const hash = getBagSpecHash(bagSpec);
    if (!hash) {
      return;
    }
    const bag = bagSpecToBag(bagSpec);
    if (!bag) {
      return;
    }

    player.inventory.take(event.src);

    let output: ItemBag | undefined;

    // If we match a recipe explicitly with a craftWith, use that.
    const candidateRecipes = recipesMap().peek(hash);
    const filteredRecipes = candidateRecipes?.filter((recipe) =>
      anItem(recipe).craftWith?.includes(stationItem.id)
    );
    if (filteredRecipes?.length) {
      // If there are multiple recipes matching our ingredients, pick one randomly.
      const recipe = sample(filteredRecipes)!;
      output = getRecipeOutput(anItem(recipe));
    }

    if (!output) {
      // Otherwise, programmatic composting.
      // Dirt/Grass + fish, flora, or seed = fertilizer
      // give back the minimum of dirt blocks and compostable blocks.
      // if we have more than a 6:1 ratio, return super fertilizer instead
      output = createBag();

      // Count compostables and dirt/grass.
      let numDirtGrass = 0;
      let numCompostable = 0;
      const nonCompostable = createBag();
      for (const [_pk, itemCount] of bag) {
        const item = itemCount.item;
        const count = itemCountToApproximateNumber(itemCount);
        if (
          // Dirt/grass.
          itemCount.item.id === BikkieIds.dirt ||
          itemCount.item.id === BikkieIds.grass
        ) {
          numDirtGrass += count;
        } else if (isCompostableItem(item)) {
          // Compostable.
          numCompostable += count;
        } else {
          // Non-compostable
          addToBag(nonCompostable, itemCount);
        }
      }
      // Refund any non compostables
      addToBag(output, nonCompostable);

      if (numDirtGrass > 0) {
        // Fertilizer.
        let numUsedDirtGrass = 0;
        let numUsedCompostable = 0;
        if (numCompostable / numDirtGrass >= COMPOST_FOR_SUPER_FERTILIZER) {
          // We have the correct ratio. Give back super fertilizer
          const numFertilizer = Math.floor(
            Math.min(
              numDirtGrass,
              numCompostable / COMPOST_FOR_SUPER_FERTILIZER
            )
          );
          if (numFertilizer > 0) {
            addToBag(
              output,
              countOf(BikkieIds.superFertilizer, BigInt(numFertilizer))
            );
          }
          numUsedDirtGrass = numFertilizer;
          numUsedCompostable = numFertilizer * COMPOST_FOR_SUPER_FERTILIZER;
        } else {
          // Give normal fertilizer.
          const numFertilizer = Math.floor(
            Math.min(numDirtGrass, numCompostable)
          );
          if (numFertilizer > 0) {
            addToBag(
              output,
              countOf(BikkieIds.fertilizer, BigInt(numFertilizer))
            );
          }
          numUsedDirtGrass = numFertilizer;
          numUsedCompostable = numFertilizer;
        }
        // Refund unused dirt/grass as dirt
        const dirtRefund = Math.floor(numDirtGrass - numUsedDirtGrass);
        if (dirtRefund > 0) {
          addToBag(output, countOf(BikkieIds.dirt, BigInt(dirtRefund)));
        }
        // Refund unused compostable as bling
        const compostRefund = Math.floor(numCompostable - numUsedCompostable);
        if (compostRefund > 0) {
          addToBag(
            output,
            countOf(BikkieIds.bling, BigInt(compostRefund * BLING_PER_COMPOST))
          );
        }
      } else {
        // No dirt or grass; give 0.1 * number of blocks in bling back.
        addToBag(
          output,
          countOf(BikkieIds.bling, BigInt(numCompostable * BLING_PER_COMPOST))
        );
      }
    }

    if (output) {
      player.inventory.giveOrThrow(output);
    }

    const royalties = calculateCraftingStationRoyalty(
      player.id,
      stationOwner?.id,
      stationItem
    );
    maybePayRoyalties(royalties, player, stationOwner);
    context.publish({
      kind: "craft",
      entityId: player.id,
      bag: itemBagToString(output),
      station: stationItem?.id,
      stationEntityId: station?.id,
      royaltyTo: stationOwner?.id,
      royaltyAmount: royalties?.count,
    });
  },
});

export const allCraftingHandlers = [
  inventoryCraftEventHandler,
  inventoryCookEventHandler,
  inventoryCompostEventHandler,
];
