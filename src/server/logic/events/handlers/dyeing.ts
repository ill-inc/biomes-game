import {
  aclChecker,
  makeEventHandler,
  RollbackError,
} from "@/server/logic/events/core";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { ItemPayload } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { log } from "@/shared/logging";
import { isDyeItem, itemIsDyeable } from "@/shared/util/dye_helpers";

import { q } from "@/server/logic/events/query";
import { blockPos } from "@/shared/game/shard";

const inventoryDyeEventHandler = makeEventHandler("inventoryDyeEvent", {
  involves: (event) => ({
    player: event.id,
  }),
  apply: ({ player }, event, context) => {
    const inventory = new PlayerInventoryEditor(context, player);
    const dyeItem = inventory.get(event.src);
    if (!dyeItem) {
      log.warn("No dye item found in source slot when attempting to dye.");
      return;
    }
    if (!isDyeItem(dyeItem.item)) {
      log.warn(
        `Attempted to use item id ${dyeItem.item.id} as a dye, but it is not one.`
      );
      return;
    }

    const dyeTarget = inventory.get(event.dst);
    if (!dyeTarget) {
      log.warn("Could not find a dye target.");
      return;
    }
    if (!itemIsDyeable(dyeTarget.item)) {
      log.warn(`Dye target (id: ${dyeTarget.item.id}) is not a dyeable item.`);
      return;
    }
    if (dyeTarget.count > 1) {
      log.warn(
        "Dye target has a stack of more than one, can only dye one item at a time."
      );
      return;
    }

    if (!inventory.attemptTakeFromSlot(event.src, countOf(dyeItem.item))) {
      throw new RollbackError(`Failed to consume dye item.`);
    }

    // Update the item's payload to be marked with the new dye item.
    inventory.set(
      event.dst,
      countOf(
        dyeTarget.item.id,
        <ItemPayload>{
          ...dyeTarget.item.payload,
          [attribs.dyedWith.id]: dyeItem.item.id,
        },
        dyeTarget.count
      )
    );
  },
});

// TODO: Update this to use dedicated dyeing ACL
const DYE_ACTION = "place";

const dyeBlockEventHandler = makeEventHandler("dyeBlockEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    terrain: q.terrain(event.id),
    acl: aclChecker({ kind: "point", point: event.position }, event.user_id),
  }),
  apply: ({ terrain, acl }, event) => {
    if (!acl.can(DYE_ACTION)) {
      return;
    }
    const shardPos = blockPos(...event.position);
    terrain.setTerrainAt(
      shardPos,
      {
        dyeId: event.dye,
      },
      acl.restoreTimeSecs(DYE_ACTION)
    );
  },
});

export const dyingEventHandlers = [
  inventoryDyeEventHandler,
  dyeBlockEventHandler,
];
