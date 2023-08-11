import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { Outfit } from "@/server/logic/utils/outfit";
import { countOf } from "@/shared/game/items";

const addToOutfitHandler = makeEventHandler("addToOutfitEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => {
    return {
      outfitEntity: q.id(event.id).with("wearing").with("placed_by"),
      player: q.id(event.player_id).with("inventory"),
    };
  },
  apply: ({ outfitEntity, player }, event, context) => {
    const outfit = new Outfit(outfitEntity);
    if (!outfit.canBeModifiedBy(player.id)) {
      throw new Error("Player does not have permission to modify the outfit.");
    }
    const inventory = new PlayerInventoryEditor(context, player);
    const slot = inventory.get(event.src);
    if (!slot) {
      // Slot is empty.
      return;
    }

    // Add the item to the outfit and replace it with any item that was displaced.
    const itemToAdd = slot.item;
    const itemThatWasReplaced = outfit.addToOutfit(itemToAdd);
    const newInventoryItem = itemThatWasReplaced
      ? countOf(itemThatWasReplaced, 1n)
      : undefined;
    inventory.set(event.src, newInventoryItem);
  },
});

const equipOutfitHandler = makeEventHandler("equipOutfitEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => {
    return {
      outfitEntity: q.id(event.id).with("wearing").with("placed_by"),
      player: q.id(event.player_id).with("inventory"),
    };
  },
  apply: ({ outfitEntity, player }, _event, _context) => {
    const outfit = new Outfit(outfitEntity);
    if (!outfit.canBeModifiedBy(player.id)) {
      throw new Error("Player does not have permission to modify the outfit.");
    }
    outfit.equipToEntity(player);
  },
});

export const allOutfitHandlers = [addToOutfitHandler, equipOutfitHandler];
