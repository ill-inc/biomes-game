import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import {
  modifyPlayerHealth,
  setPlayerHealth,
  setPlayerMaxHealth,
} from "@/server/logic/utils/players";
import { BikkieIds } from "@/shared/bikkie/ids";

export const playerInitEventHandler = makeEventHandler("playerInitEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    player: event.id,
  }),
  apply: ({ player }, _event, context) => {
    if (player.playerStatus()?.init) {
      return;
    }
    player.mutablePlayerStatus().init = true;

    const inventory = new PlayerInventoryEditor(context, player);
    inventory.giveCurrency(BikkieIds.bling, 10n);
  },
});

export const playerSetNUXStatusEventHandler = makeEventHandler(
  "setNUXStatusEvent",
  {
    involves: (event) => ({
      player: q.includeIced(event.id),
    }),
    apply: ({ player }, event) => {
      player.mutablePlayerStatus().nux_status.set(event.nux_id, {
        ...event.status,
      });
    },
  }
);

export const updatePlayerHealthEventHandler = makeEventHandler(
  "updatePlayerHealthEvent",
  {
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
      attacker:
        event.damageSource?.kind === "attack"
          ? q.id(event.damageSource.attacker)
          : undefined,
    }),
    apply: (
      { attacker, player, playerActiveMinigame, playerActiveMinigameInstance },
      event,
      context
    ) => {
      if (event.damageSource?.kind === "attack") {
        const health = attacker?.health();
        if (health !== undefined && health.hp <= 0) {
          // You cannot attack if you're dead.
          return;
        }
      }

      if (event.hp !== undefined) {
        setPlayerHealth(
          player,
          event.hp,
          event.damageSource,
          playerActiveMinigame,
          playerActiveMinigameInstance,
          context
        );
      } else if (event.hpDelta !== undefined) {
        modifyPlayerHealth(
          player,
          event.hpDelta,
          event.damageSource,
          playerActiveMinigame,
          playerActiveMinigameInstance,
          context
        );
      }
      if (event.maxHp !== undefined) {
        setPlayerMaxHealth(player, event.maxHp);
      }
    },
  }
);
