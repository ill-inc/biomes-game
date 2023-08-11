import { makeEventHandler, RollbackError } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import {
  forcePlayerWarp,
  setPlayerHealth,
  startPlayerEmote,
} from "@/server/logic/utils/players";
import { onWarpHomeHook } from "@/server/shared/minigames/logic_hooks";
import { BikkieIds } from "@/shared/bikkie/ids";
import { countOf } from "@/shared/game/items";
import { log } from "@/shared/logging";

export const warpEventHandler = makeEventHandler("warpEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    player: event.id,
    royaltyTarget: q.optional(event.royaltyTarget)?.includeIced(),
  }),
  apply: ({ player, royaltyTarget }, event, context) => {
    const playerInventory = new PlayerInventoryEditor(context, player);
    if (!playerInventory.trySpendCurrency(BikkieIds.bling, event.cost)) {
      throw new RollbackError("Tried to warp but didn't have enough dough");
    }

    if (
      royaltyTarget !== undefined &&
      royaltyTarget.id !== player.id &&
      event.royalty
    ) {
      new PlayerInventoryEditor(context, royaltyTarget).giveCurrency(
        BikkieIds.bling,
        event.royalty
      );
    }

    forcePlayerWarp(player, event.position, event.orientation);
    startPlayerEmote(player, { emote_type: "warp" });
  },
});

export const warpHomeEventHandler = makeEventHandler("warpHomeEvent", {
  prepareInvolves: (event) => ({
    player: q.id(event.id),
  }),
  prepare: ({ player }) => ({
    activeMinigameId: player.playing_minigame?.minigame_id,
    activeMinigameInstanceId: player.playing_minigame?.minigame_instance_id,
  }),
  mergeKey: (event) => event.id,
  involves: (event, { activeMinigameId, activeMinigameInstanceId }) => ({
    player: event.id,
    playerActiveMinigame:
      activeMinigameId &&
      q.id(activeMinigameId).with("minigame_component").includeIced(),
    playerActiveMinigameInstance:
      activeMinigameInstanceId &&
      q.id(activeMinigameInstanceId).with("minigame_instance").includeIced(),
  }),
  apply: (
    { player, playerActiveMinigame, playerActiveMinigameInstance },
    { reason, position, orientation },
    context
  ) => {
    forcePlayerWarp(player, position, orientation);
    onWarpHomeHook(player, playerActiveMinigameInstance, reason);

    if (reason === "admin") {
      return; // Silent but effective.
    }

    if (reason === "respawn") {
      // Reset health
      if (player.health()?.maxHp) {
        setPlayerHealth(
          player,
          player.health()!.maxHp,
          undefined,
          playerActiveMinigame,
          playerActiveMinigameInstance,
          context
        );
      }

      // Skip homestone usage for respawn event
      return;
    }

    const inventory = new PlayerInventoryEditor(context, player);
    const result = inventory.find(countOf(BikkieIds.homestone));
    if (!result) {
      // You don't have a homestone.
      return;
    }
    const [ref] = result;
    if (!inventory.tryUseCharge(ref)) {
      log.warn("Tried to warp home without enough charge");
      return;
    }
  },
});
