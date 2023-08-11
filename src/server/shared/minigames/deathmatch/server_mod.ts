import { newPlayerInventory } from "@/server/logic/utils/players";
import { GameEvent } from "@/server/shared/api/game_event";
import { deathmatchHandlers } from "@/server/shared/minigames/deathmatch/handlers";
import { zDeathmatchSettings } from "@/server/shared/minigames/deathmatch/types";
import {
  PLAYER_WAIT_TIME_S,
  deathmatchNotReadyReason,
  handleDeathmatchTick,
} from "@/server/shared/minigames/deathmatch/util";
import { mutMinigameComponentOfMetadataKind } from "@/server/shared/minigames/type_utils";
import type { ModLogicHooks, ServerMod } from "@/server/shared/minigames/types";
import {
  closeMinigameInstance,
  defaultMinigameItemAttributes,
  sampleElementPositionForSpawn,
  scheduleMinigameTick,
} from "@/server/shared/minigames/util";
import { BikkieIds } from "@/shared/bikkie/ids";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { BuffsComponent, MinigameComponent } from "@/shared/ecs/gen/components";
import { JoinDeathmatchEvent } from "@/shared/ecs/gen/events";
import { countOf, createBag } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import { first } from "lodash";

const logicHooks: ModLogicHooks = {
  onMinigamePlayerRemoved({
    player,
    minigameEntity,
    minigameInstanceEntity,
    context,
  }) {
    const minigameMetadata = minigameEntity.minigameComponent().metadata;
    const minigameInstanceState =
      minigameInstanceEntity.mutableMinigameInstance().state;

    ok(minigameMetadata.kind === "deathmatch");
    ok(minigameMetadata.kind === minigameInstanceState.kind);

    minigameInstanceState.player_states.delete(player.id);
    const numPlayers = minigameInstanceState.player_states.size;
    if (numPlayers === 0) {
      closeMinigameInstance(minigameEntity, minigameInstanceEntity, context);
    } else if (
      numPlayers === 1 &&
      minigameInstanceState.instance_state?.kind !== "finished"
    ) {
      minigameInstanceState.instance_state = {
        kind: "waiting_for_players",
      };
    }
  },

  onMinigamePlayerAdded({ player, minigameInstanceEntity }, _context) {
    player.setInventory(newPlayerInventory());
    player.setBuffsComponent(BuffsComponent.create());

    const instanceState =
      minigameInstanceEntity.mutableMinigameInstance().state;
    ok(instanceState.kind === "deathmatch");

    // Plop you in
    instanceState.player_states.set(player.id, {
      deaths: 0,
      kills: 0,
      last_death: undefined,
      last_kill: undefined,
      playerId: player.id,
    });

    // Start the countdown
    if (instanceState.instance_state?.kind === "waiting_for_players") {
      instanceState.instance_state = {
        kind: "play_countdown",
        round_start: secondsSinceEpoch() + PLAYER_WAIT_TIME_S,
      };
      scheduleMinigameTick(minigameInstanceEntity, PLAYER_WAIT_TIME_S);
    }
  },

  onPlayerDeath({ player, activeMinigameInstance, damageSource }) {
    const mutInstance = activeMinigameInstance.mutableMinigameInstance();
    ok(mutInstance.state.kind === "deathmatch");
    const deathPlayerState = mutInstance.state.player_states.get(player.id);
    if (deathPlayerState) {
      deathPlayerState.deaths += 1;
      deathPlayerState.last_death = secondsSinceEpoch();
    }

    if (damageSource?.kind === "attack") {
      const attackerState = mutInstance.state.player_states.get(
        damageSource.attacker
      );
      if (attackerState) {
        attackerState.kills += 1;
        attackerState.last_kill = secondsSinceEpoch();
      }
    }
  },

  onMinigameElementAssociated({ element, minigame }) {
    const placeable = element.placeableComponent();
    if (!placeable) {
      return;
    }

    const comp = mutMinigameComponentOfMetadataKind(minigame, "deathmatch");
    if (placeable.item_id === BikkieIds.deathmatchEnter) {
      comp.metadata.start_ids.add(element.id);
    }

    comp.ready = !Boolean(deathmatchNotReadyReason(comp));
  },

  onMinigameElementDisassociated({ element, minigame }) {
    const placeable = element.placeableComponent();
    if (!placeable) {
      return;
    }

    const comp = mutMinigameComponentOfMetadataKind(minigame, "deathmatch");
    comp.metadata.start_ids.delete(element.id);
    comp.ready = !Boolean(deathmatchNotReadyReason(comp));
  },

  onTick(tickEntities, context, dt) {
    return handleDeathmatchTick(tickEntities, context, dt);
  },
};

export const deathMatchServerMod: ServerMod<"deathmatch"> = {
  kind: "deathmatch",
  settingsType: zDeathmatchSettings,
  playerRestoredComponents: ["inventory", "buffs_component"],
  kitSpec: (minigameId: BiomesId) => {
    return [
      MinigameComponent.create({
        metadata: {
          kind: "deathmatch",
          start_ids: new Set(),
        },
      }),
      createBag(
        countOf(
          BikkieIds.deathmatchEnter,
          defaultMinigameItemAttributes(minigameId),
          1n
        )
      ),
    ];
  },

  handleCreateOrJoinWebRequest: async (deps, minigame, activeInstances) => {
    const instance = first(activeInstances);
    await deps.logicApi.publish(
      new GameEvent(
        deps.userId,
        new JoinDeathmatchEvent({
          id: deps.userId,
          minigame_id: minigame.id,
          minigame_instance_id: instance?.id,
        })
      )
    );
  },

  observerPosition({ minigameElements }) {
    return sampleElementPositionForSpawn(
      minigameElements.filter(
        (e) => e.placeableComponent()?.item_id === BikkieIds.deathmatchEnter
      )
    );
  },

  spawnPosition({ minigameElements }) {
    return sampleElementPositionForSpawn(
      minigameElements.filter(
        (e) => e.placeableComponent()?.item_id === BikkieIds.deathmatchEnter
      )
    );
  },

  eventHandlers: deathmatchHandlers,
  logicHooks,
};
