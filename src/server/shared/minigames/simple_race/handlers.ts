import { makeEventHandler, newId } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { forcePlayerWarp } from "@/server/logic/utils/players";
import { serverModFor } from "@/server/shared/minigames/server_mods";
import { handleSimpleRaceReachCheckpoint } from "@/server/shared/minigames/simple_race/util";
import {
  isMinigameInstanceOfStateKind,
  mutInstanceOfStateKind,
} from "@/server/shared/minigames/type_utils";
import {
  addPlayerToMinigameInstance,
  createMinigameInstance,
  removePlayerFromMinigameInstance,
} from "@/server/shared/minigames/util";

import { secondsSinceEpoch } from "@/shared/ecs/config";
import { MinigameInstance } from "@/shared/ecs/gen/components";
import type { MinigameSimpleRaceFinish } from "@/shared/firehose/events";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { ok } from "assert";

const startSimpleRaceEventHandler = makeEventHandler(
  "startSimpleRaceMinigameEvent",
  {
    prepareInvolves: (event) => ({
      minigame: q
        .id(event.minigame_id)
        .with("minigame_component")
        .includeIced(),
    }),
    prepare: ({ minigame }) => ({
      minigameElementIds: [...minigame.minigame_component.minigame_element_ids],
      minigameCreatorId: minigame.created_by?.id,
    }),
    involves: (event, { minigameElementIds, minigameCreatorId }) => ({
      player: q.id(event.id),
      minigame: q
        .id(event.minigame_id)
        .with("minigame_component")
        .includeIced(),
      minigameCreator: q.optional(minigameCreatorId)?.includeIced(),
      minigameElements: q
        .ids(minigameElementIds)
        .with("minigame_element")
        .optional(),
      newInstanceId: newId(),
      newStashEntityId: newId(),
    }),
    apply: (
      {
        player,
        minigame,
        minigameElements,
        minigameCreator,
        newInstanceId,
        newStashEntityId,
      },
      _event,
      context
    ) => {
      const newInstance = createMinigameInstance(
        minigame,
        newInstanceId,
        MinigameInstance.create({
          minigame_id: minigame.id,
          finished: false,
          state: {
            kind: "simple_race",
            player_state: "waiting",
            started_at: secondsSinceEpoch(),
            deaths: 0,
            reached_checkpoints: new Map(),
            finished_at: undefined,
          },
        }),
        context
      );

      addPlayerToMinigameInstance(
        {
          player,
          minigame,
          minigameCreator,
          minigameInstance: newInstance,
          minigameElements,
          stashEntityId: newStashEntityId,
        },
        context
      );
    },
  }
);

const finishSimpleRaceEventHandler = makeEventHandler(
  "finishSimpleRaceMinigameEvent",
  {
    prepareInvolves: (event) => ({
      player: q.id(event.id),
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("minigame_instance"),
    }),
    prepare: ({ player, minigameInstance }) => ({
      playerStashedEntityId:
        minigameInstance.minigame_instance.active_players.get(player.id)
          ?.entry_stash_id ?? INVALID_BIOMES_ID,
    }),
    involves: (event, { playerStashedEntityId }) => ({
      player: q.id(event.id).with("playing_minigame").includeIced(),
      minigame: q
        .id(event.minigame_id)
        .with("created_by", "minigame_component")
        .includeIced(),
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("created_by", "minigame_instance")
        .includeIced(),
      minigameElement: q.id(event.minigame_element_id),
      playerStashedEntity: q
        .id(playerStashedEntityId)
        .with("stashed")
        .includeIced(),
    }),
    apply: (
      { player, minigame, minigameInstance, playerStashedEntity },
      event,
      context
    ) => {
      ok(
        player.playingMinigame().minigame_instance_id === minigameInstance.id,
        "Not playing this game"
      );

      ok(
        minigameInstance.createdBy().id === minigame.id,
        "Wrong instance passed"
      );
      const instanceComponent = minigameInstance.minigameInstance();
      ok(isMinigameInstanceOfStateKind(instanceComponent, "simple_race"));

      if (instanceComponent.state.player_state !== "racing") {
        return;
      }

      removePlayerFromMinigameInstance(
        player,
        playerStashedEntity,
        minigame,
        minigameInstance,
        context
      );

      context.publish(<MinigameSimpleRaceFinish>{
        kind: "minigame_simple_race_finish",
        entityId: player.id,
        duration: secondsSinceEpoch() - instanceComponent.state.started_at,
        finishTime: secondsSinceEpoch(),
        minigameCreatorId: minigame.createdBy().id,
        startTime: instanceComponent.state.started_at,
        minigameId: minigame.id,
        minigameInstanceId: minigameInstance.id,
      });
    },
  }
);

const reachCheckpointSimpleRaceMinigameEventHandler = makeEventHandler(
  "reachCheckpointSimpleRaceMinigameEvent",
  {
    involves: (event) => ({
      player: q.id(event.id).with("playing_minigame").includeIced(),
      minigame: q
        .id(event.minigame_id)
        .with("created_by", "minigame_component")
        .includeIced(),
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("created_by", "minigame_instance")
        .includeIced(),
      minigameElement: q.id(event.minigame_element_id),
    }),
    apply: ({ player, minigame, minigameElement, minigameInstance }) => {
      ok(
        player.playingMinigame().minigame_instance_id === minigameInstance.id,
        "Not playing this game"
      );

      ok(
        minigameInstance.createdBy().id === minigame.id,
        "Wrong instance passed"
      );

      handleSimpleRaceReachCheckpoint(minigameInstance, minigameElement);
    },
  }
);

const restartSimpleRaceMinigameEventHandler = makeEventHandler(
  "restartSimpleRaceMinigameEvent",
  {
    prepareInvolves: (event) => ({
      minigame: q
        .id(event.minigame_id)
        .with("minigame_component")
        .includeIced(),
    }),
    prepare: ({ minigame }) => ({
      minigameElementIds: [...minigame.minigame_component.minigame_element_ids],
    }),
    involves: (event, { minigameElementIds }) => ({
      player: q.id(event.id).with("playing_minigame").includeIced(),
      minigame: q
        .id(event.minigame_id)
        .with("created_by", "minigame_component")
        .includeIced(),
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("created_by", "minigame_instance")
        .includeIced(),
      minigameElements: q
        .ids(minigameElementIds)
        .with("minigame_element")
        .optional(),
    }),
    apply: ({ player, minigame, minigameInstance, minigameElements }) => {
      ok(
        player.playingMinigame().minigame_instance_id === minigameInstance.id,
        "Not playing this game"
      );

      ok(
        minigameInstance.createdBy().id === minigame.id,
        "Wrong instance passed"
      );

      const mutInstance = mutInstanceOfStateKind(
        minigameInstance,
        "simple_race"
      );
      const mod = serverModFor("simple_race");
      const spawn = mod.spawnPosition({
        kind: "initial",
        minigameInstance,
        minigame,
        minigameElements,
        player,
      });
      if (spawn) {
        forcePlayerWarp(player, spawn[0], spawn[1]);
      }

      mutInstance.state.reached_checkpoints.clear();
      mutInstance.finished = false;
      mutInstance.state.deaths = 0;
      mutInstance.state.player_state = "waiting";
    },
  }
);

const reachStartSimpleRaceMinigameEventHandler = makeEventHandler(
  "reachStartSimpleRaceMinigameEvent",
  {
    involves: (event) => ({
      player: q.id(event.id).with("playing_minigame").includeIced(),
      minigame: q
        .id(event.minigame_id)
        .with("created_by", "minigame_component")
        .includeIced(),
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("created_by", "minigame_instance")
        .includeIced(),
      minigameElement: q.id(event.minigame_element_id),
    }),
    apply: ({ player, minigame, minigameInstance }) => {
      ok(
        player.playingMinigame().minigame_instance_id === minigameInstance.id,
        "Not playing this game"
      );

      ok(
        minigameInstance.createdBy().id === minigame.id,
        "Wrong instance passed"
      );

      const mutInstance = mutInstanceOfStateKind(
        minigameInstance,
        "simple_race"
      );
      if (mutInstance.state.player_state === "waiting") {
        mutInstance.state.player_state = "racing";
        mutInstance.state.started_at = secondsSinceEpoch();
      }
    },
  }
);

export const simpleRaceHandlers = [
  startSimpleRaceEventHandler,
  finishSimpleRaceEventHandler,
  reachCheckpointSimpleRaceMinigameEventHandler,
  reachStartSimpleRaceMinigameEventHandler,
  restartSimpleRaceMinigameEventHandler,
];
