import { makeEventHandler, RollbackError } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { rollSpec } from "@/server/logic/utils/drops";
import { decrementItemDurability } from "@/server/logic/utils/durability";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { FishedEvent } from "@/shared/firehose/events";
import type { ItemPayload } from "@/shared/game/item";
import { countOf, fishingBagTransform } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";

// TODO: these handlers are insecure (client orchestrated) and should be moved
//       to a model where the server handles the time-to-bite and drop roll.
//       The server can provide a token and consume bait in that event handler.

const fishingClaimEventHandler = makeEventHandler("fishingClaimEvent", {
  involves: (event) => ({ player: q.includeIced(event.id) }),
  apply: ({ player }, event, context) => {
    const inventory = new PlayerInventoryEditor(context, player);
    decrementItemDurability(inventory, event.tool_ref, event.catch_time * 1000);
    inventory.giveOrThrow(fishingBagTransform(event.bag));
  },
});

const fishingConsumeBaitEventHandler = makeEventHandler(
  "fishingConsumeBaitEvent",
  {
    involves: (event) => ({ player: q.includeIced(event.id) }),
    apply: ({ player }, event, context) => {
      const inventory = new PlayerInventoryEditor(context, player);
      if (!inventory.attemptTakeFromSlot(event.ref, countOf(event.item_id))) {
        throw new RollbackError("Could not consume bait");
      }
    },
  }
);

const fishingCaughtEventHandler = makeEventHandler("fishingCaughtEvent", {
  involves: (event) => ({ player: q.includeIced(event.id) }),
  apply: ({ player }, event, context) => {
    context.publish(<FishedEvent>{
      kind: "fished",
      entityId: player.id,
      bag: itemBagToString(event.bag),
    });
  },
});

const fishingFailedEventHandler = makeEventHandler("fishingFailedEvent", {
  involves: (event) => ({ player: q.includeIced(event.id) }),
  apply: ({ player }, event, context) => {
    const inventory = new PlayerInventoryEditor(context, player);
    decrementItemDurability(inventory, event.tool_ref, event.catch_time * 1000);
  },
});

const treasureRollEventHandler = makeEventHandler("treasureRollEvent", {
  involves: (event) => ({ player: q.player(event.id) }),
  apply: ({ player }, event, _context) => {
    const src = player.inventory.get(event.ref);

    if (!src?.item.treasureChestDrop) {
      throw new RollbackError("Expected to claim a treasure chest only");
    }

    const items = rollSpec(src.item.treasureChestDrop);
    const chestBase: ItemPayload = {
      ...src.item.payload,
      [attribs.wrappedItemBag.id]: itemBagToString(items),
    };
    player.inventory.set(event.ref, countOf(src.item.id, chestBase, src.count));
  },
});

export const allFishingEventHandlers = [
  fishingClaimEventHandler,
  fishingConsumeBaitEventHandler,
  fishingCaughtEventHandler,
  fishingFailedEventHandler,
  treasureRollEventHandler,
];
