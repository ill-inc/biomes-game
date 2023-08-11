import type {
  AclChecker,
  EventContext,
  InvolvedSpecification,
} from "@/server/logic/events/core";
import {
  RollbackError,
  aclChecker,
  makeEventHandler,
  newId,
} from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import type { WithInventory } from "@/server/logic/events/with_inventory";
import { newDrop } from "@/server/logic/utils/drops";
import { bikkieDerived, getBiscuit } from "@/shared/bikkie/active";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { ReadonlyDeltaWith } from "@/shared/ecs/gen/delta";
import type {
  InventoryCombineEvent,
  InventorySplitEvent,
  InventorySwapEvent,
} from "@/shared/ecs/gen/events";
import { type AnyEvent } from "@/shared/ecs/gen/events";
import type {
  ItemContainer,
  ReadonlyOptionalBiomesId,
  ReadonlyOwnedItemReference,
  Vec3f,
} from "@/shared/ecs/gen/types";
import {
  isCombinableItems,
  isValidInventoryItemCount,
  maxInventoryStack,
} from "@/shared/game/inventory";
import {
  countOf,
  createBag,
  isDroppableItem,
  itemDeletesOnDrop,
} from "@/shared/game/items";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { ReadonlyBiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { dist } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { bigIntMin } from "@/shared/util/bigint";
import { compact } from "lodash";

type InventoryEvents = AnyEvent & {
  player_id: ReadonlyBiomesId;
  src_id: ReadonlyBiomesId;
  src: ReadonlyOwnedItemReference;
  dst_id: ReadonlyOptionalBiomesId;
  dst: ReadonlyOwnedItemReference;
  positions: ReadonlyArray<ReadonlyVec3>;
};

export function makeInventoryEventHandler<TEvent extends InventoryEvents>(
  kind: TEvent["kind"],
  apply: (
    results: {
      src: WithInventory;
      dst: WithInventory;
      player: ReadonlyDeltaWith<"id">;
      acl: AclChecker;
    },
    event: TEvent,
    context: EventContext<InvolvedSpecification>
  ) => void,
  options?: { ignoreTakePermissions?: boolean; ignoreGivePermissions?: boolean }
) {
  return makeEventHandler(kind, {
    involves: (event) => {
      const inventoryEvent = event as TEvent;
      return {
        player: q.id(inventoryEvent.player_id),
        src: q.inventory(inventoryEvent.src_id),
        dst: inventoryEvent.dst_id
          ? q.inventory(inventoryEvent.dst_id)
          : undefined,
        acl: aclChecker(
          { kind: "points", points: inventoryEvent.positions },
          inventoryEvent.player_id
        ),
      };
    },
    apply: ({ src, dst, player, acl }, event, context) => {
      if (
        (dst &&
          !options?.ignoreGivePermissions &&
          !checkInventoryPermissions(player, dst.delta(), acl, "give")) ||
        (src &&
          !options?.ignoreTakePermissions &&
          !checkInventoryPermissions(player, src.delta(), acl, "take"))
      ) {
        throw new RollbackError("Insufficient permissions to swap items.");
      }
      return apply(
        { src, dst: dst ?? src, player, acl },
        event as TEvent,
        context
      );
    },
  });
}

function checkInventoryPermissions(
  player: ReadonlyDeltaWith<"id">,
  entity: ReadonlyDeltaWith<"id">,
  acl: AclChecker,
  _direction?: "take" | "give"
) {
  if (player.id === entity.id) {
    return true;
  }

  const placeableComponent = entity.placeableComponent();
  if (placeableComponent) {
    // Check acl for positions of the item
    return acl.can("destroy", { entity });
  }

  return false;
}

const inventorySwapEventHandler = makeInventoryEventHandler<InventorySwapEvent>(
  "inventorySwapEvent",
  ({ src, dst }, event) => {
    const a = src.inventory.get(event.src);
    const b = dst.inventory.get(event.dst);
    src.inventory.set(event.src, b);
    dst.inventory.set(event.dst, a);
  }
);

const inventoryCombineEventHandler =
  makeInventoryEventHandler<InventoryCombineEvent>(
    "inventoryCombineEvent",
    ({ src, dst }, event) => {
      const a = src.inventory.get(event.src);
      const b = dst.inventory.get(event.dst);
      if (!a) {
        throw new Error("Ignoring combine from empty source slot!");
        return;
      }
      if (!b) {
        // No destination, just move it.
        src.inventory.set(event.src, undefined);
        dst.inventory.set(event.dst, a);
        return;
      }

      if (!isCombinableItems({ from: a, to: b, count: event.count })) {
        throw new Error(
          "Tried to perform invalid combination, ignoring event."
        );
        return;
      }
      dst.inventory.set(event.dst, {
        ...b,
        count: b.count + event.count,
      });
      src.inventory.set(event.src, {
        ...b,
        count: a.count - event.count,
      });
    }
  );

const inventorySplitEventHandler =
  makeInventoryEventHandler<InventorySplitEvent>(
    "inventorySplitEvent",
    ({ src, dst }, event) => {
      const a = src.inventory.get(event.src);
      const b = dst.inventory.get(event.dst);

      if (b !== undefined || a === undefined) {
        throw new Error(
          "Tried to split to or from non-empty cell... ignoring event"
        );
        return;
      } else if (
        !isValidInventoryItemCount(a.item, event.count) ||
        !isValidInventoryItemCount(a.item, a.count - event.count)
      ) {
        throw new Error(
          "Tried to split with an invalid count for inventory... ignoring event"
        );
      }

      src.inventory.set(event.src, {
        ...a,
        count: a.count - event.count,
      });
      dst.inventory.set(event.dst, {
        ...a,
        count: event.count,
      });
    }
  );

const inventoryThrowEventHandler = makeEventHandler("inventoryThrowEvent", {
  involves: (event) => ({ player: q.player(event.id), drop: newId() }),
  apply: ({ player, drop }, event, context) => {
    if (!player.position()) {
      // You can't drop if you're not in the world.
      return;
    }

    const from = player.inventory?.get(event.src);
    if (!from) {
      throw new RollbackError("Can't drop nothing...");
    }

    if (!isDroppableItem(from.item)) {
      throw new RollbackError("Invalid droppable...");
    }

    // TODO move this to validation pass
    // drop the item at player's feet if it was requested to be too far away
    const dropPosition =
      dist(event.position, player.position()!) <= CONFIG.gameThrowDistance
        ? event.position
        : <Vec3f>[...player.position()!];

    // Drop in the direction the player is viewing.
    const dropItem = {
      ...from,
      count: event.count ?? from.count,
    };
    if (!player.inventory?.attemptTakeFromSlot(event.src, dropItem)) {
      throw new RollbackError("Couldn't drop...");
    }
    if (!itemDeletesOnDrop(dropItem.item)) {
      context.create(
        newDrop(drop, dropPosition, false, [dropItem], {
          kind: "block",
          entity_ids: new Set([event.id]),
          expiry: secondsSinceEpoch() + CONFIG.gameThrownFilterSecs,
        })
      );
    }
  },
});

const inventoryDestroyEventHandler = makeEventHandler("inventoryDestroyEvent", {
  involves: (event) => ({ player: q.player(event.id) }),
  apply: ({ player }, event) => {
    const from = player.inventory?.get(event.src);
    if (!from) {
      return;
    }

    if (!isDroppableItem(from.item)) {
      throw new RollbackError("Item not destroyable...");
    }

    // Drop in the direction the player is viewing.
    const dropItem = {
      ...from,
      count: event.count ?? from.count,
    };

    if (!player.inventory?.attemptTakeFromSlot(event.src, dropItem)) {
      throw new RollbackError("Item quantity not valid...");
    }
  },
});

const inventoryChangeSelectionEventHandler = makeEventHandler(
  "inventoryChangeSelectionEvent",
  {
    involves: (event) => ({ player: q.player(event.id) }),
    apply: ({ player }, event) => {
      player.inventory.setSelected(event.ref);
    },
  }
);

const internalInventorySetEventHandler = makeEventHandler(
  "internalInventorySetEvent",
  {
    involves: (event) => ({
      player: q.player(event.id).with("gremlin").includeIced(),
    }),
    apply: ({ player }, event) => {
      player.inventory.set(event.dst, event.item);
    },
  }
);

const inventoryMoveToOverflowEventHandler = makeEventHandler(
  "inventoryMoveToOverflowEvent",
  {
    involves: (event) => ({
      player: q.player(event.id).includeIced(),
    }),
    apply: ({ player }, event) => {
      const slot = player.inventory.get(event.src);
      if (!slot) {
        throw new Error(
          "Move from inventory into overflow: Non-existent slot."
        );
      }

      const items = countOf(slot.item, event.count);
      const bag = createBag(items);
      player.inventory.moveIntoOverflow(bag);
    },
  }
);

const overflowMoveToInventoryEventHandler = makeEventHandler(
  "overflowMoveToInventoryEvent",
  {
    involves: (event) => ({
      player: q.player(event.id).includeIced(),
    }),
    apply: ({ player }, event) => {
      player.inventory.moveFromOverflow(event.payload, event.dst);
    },
  }
);

const ITEM_SORT_RANKING: ((b: Biscuit) => boolean)[] = [
  (b) => !!b.isBlessed,
  (b) => !!b.isMuckwaterFish,
  (b) => !!b.isClearwaterFish,
  (b) => !!b.isFish,
  (b) => !!b.isFruit,
  (b) => !!b.isVegetable,
  (b) => !!b.isSeed,
  (b) => !!b.isConsumable,
  (b) => !!b.isBait,
  (b) => !!b.isWearable,
  (b) => !!b.isEmissive,
  (b) => !!b.isAnyStone,
  (b) => !!b.isLog,
  (b) => !!b.isLumber,
  (b) => !!b.isBlock,
  (b) => !!b.isBuild,
  (b) => !!b.minigameId,
  (b) => !!b.isPlaceable,
  (b) => !!b.isTool,
];

const itemSortComparator = bikkieDerived("itemSortComparator", () => {
  const fallbackName = getBiscuit(INVALID_BIOMES_ID).displayName;
  return (a: Biscuit, b: Biscuit) => {
    const aRank = ITEM_SORT_RANKING.findIndex((f) => f(a));
    const bRank = ITEM_SORT_RANKING.findIndex((f) => f(b));
    if (aRank !== bRank) {
      return bRank - aRank;
    }
    const aDisplayName =
      a.displayName === fallbackName ? a.name : a.displayName;
    const bDisplayName =
      b.displayName === fallbackName ? b.name : b.displayName;
    return aDisplayName.localeCompare(bDisplayName);
  };
});

const inventorySortEventHandler = makeEventHandler("inventorySortEvent", {
  involves: (event) => ({ player: q.id(event.id).with("inventory") }),
  apply: ({ player }) => {
    const bag = createBag(...compact(player.inventory().items));
    const comparator = itemSortComparator();
    const sorted = Array.from(bag.entries()).sort(
      ([, { item: a }], [, { item: b }]) => comparator(a, b)
    );
    const output: ItemContainer = new Array(player.inventory().items.length);
    let slot = 0;
    for (const [, { item, count }] of sorted) {
      const max = maxInventoryStack(item);
      let remaining = count;
      while (remaining > 0n) {
        const take = bigIntMin(remaining, max);
        output[slot++] = { item, count: take };
        remaining -= take;
      }
    }
    player.mutableInventory().items = output;
  },
});

const unwrapWrappedItemHandler = makeEventHandler("unwrapWrappedItemEvent", {
  involves: (event) => ({ player: q.player(event.id) }),
  apply: ({ player }, event, _context) => {
    const src = player.inventory.get(event.ref);
    let stringBag = src?.item.wrappedItemBag;
    if (!src?.item.wrappedItemBag) {
      // Legacy treasure chests
      if (src?.item.data && src?.item.treasureChestDrop) {
        log.info("Unwrapping legacy treasure chest");
        stringBag = src.item.data;
      } else {
        throw new RollbackError("No wrapped items");
      }
    }

    const contents = stringToItemBag(stringBag ?? "");
    player.inventory.set(event.ref, undefined);
    player.inventory.giveWithInventoryOverflow(contents);
  },
});

export const allInventoryEventHandlers = [
  inventoryMoveToOverflowEventHandler,
  overflowMoveToInventoryEventHandler,
  inventorySplitEventHandler,
  inventorySwapEventHandler,
  inventoryCombineEventHandler,
  inventoryThrowEventHandler,
  inventoryDestroyEventHandler,
  inventoryChangeSelectionEventHandler,
  internalInventorySetEventHandler,
  inventorySortEventHandler,
  unwrapWrappedItemHandler,
];
