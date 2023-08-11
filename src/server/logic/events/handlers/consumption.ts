import { makeEventHandler, RollbackError } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { addBuff, removeBuffBy } from "@/server/logic/utils/consumption";
import { modifyPlayerHealth } from "@/server/logic/utils/players";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { buffExpirationTime, buffTimeRemaining } from "@/shared/game/buffs";
import { countOf } from "@/shared/game/items";
import { isEqual, minBy } from "lodash";

export const consumptionEventHandler = makeEventHandler("consumptionEvent", {
  prepareInvolves: (event) => ({
    player: q.id(event.id),
  }),
  prepare: ({ player }) => ({
    activeMinigameInstanceId: player.playing_minigame?.minigame_instance_id,
    activeMinigameId: player.playing_minigame?.minigame_id,
  }),
  mergeKey: (event) => event.id,
  involves: (event, { activeMinigameInstanceId, activeMinigameId }) => ({
    player: event.id,
    playerActiveMinigameInstance:
      activeMinigameInstanceId &&
      q.id(activeMinigameInstanceId).with("minigame_instance").includeIced(),
    playerActiveMinigame:
      activeMinigameId &&
      q.id(activeMinigameId).with("minigame_component").includeIced(),
  }),
  apply: (
    { player, playerActiveMinigame, playerActiveMinigameInstance },
    event,
    context
  ) => {
    const inventory = new PlayerInventoryEditor(context, player);
    const slot = inventory.get(event.inventory_ref);
    if (
      !slot ||
      !slot.item.isConsumable ||
      slot.item.id !== event.item_id ||
      !inventory.attemptTakeFromSlot(
        event.inventory_ref,
        countOf(event.item_id)
      )
    ) {
      throw new RollbackError(
        `Player ${player.id} cannot ${event.action} ${slot?.item.id}`
      );
    }

    addBuff({ itemId: event.item_id, player });

    if (slot.item.givesHealth) {
      modifyPlayerHealth(
        player,
        slot.item.givesHealth,
        {
          kind: "heal",
        },
        playerActiveMinigame,
        playerActiveMinigameInstance,
        context
      );
    }

    context.publish({
      kind: "consume",
      entityId: player.id,
      item: slot.item,
    });
  },
});

export const expireBuffsEventHandler = makeEventHandler("expireBuffsEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    player: q.includeIced(event.id).with("buffs_component"),
  }),
  apply: ({ player }, _event, _context) => {
    const time = secondsSinceEpoch();
    player.mutableBuffsComponent().buffs = player
      .buffsComponent()
      .buffs.filter((buff) => buffTimeRemaining(buff, time) > 0);

    const firstBuffToExpire = minBy(player.buffsComponent().buffs, (buff) =>
      buffExpirationTime(buff)
    );
    player.mutableBuffsComponent().trigger_at = firstBuffToExpire
      ? buffExpirationTime(firstBuffToExpire)
      : undefined;
  },
});

export const removeBuffEventHandler = makeEventHandler("removeBuffEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    player: q.includeIced(event.id).with("buffs_component"),
  }),
  apply: ({ player }, event, _context) => {
    removeBuffBy({
      player,
      shouldRemoveBuff: (buff) => isEqual(buff, event.buff),
    });
  },
});
