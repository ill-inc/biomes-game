import { makeEventHandler, newId, newIds } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import {
  queryForRelevantEntities,
  queryForTerrainInBox,
} from "@/server/logic/events/space_clipboard";
import { killPlayer } from "@/server/logic/utils/players";
import { handleSpleefCreateNew } from "@/server/shared/minigames/spleef/util";
import { instanceOfStateKind } from "@/server/shared/minigames/type_utils";
import { addPlayerToMinigameInstance } from "@/server/shared/minigames/util";
import { boxToAabb } from "@/shared/game/group";
import { ok } from "assert";

const createOrJoinSpleefEventHandler = makeEventHandler(
  "createOrJoinSpleefEvent",
  {
    prepareInvolves: (event) => ({
      terrain: queryForTerrainInBox(event.box),
      minigame: q
        .id(event.minigame_id)
        .with("minigame_component")
        .includeIced(),
    }),
    prepare: ({ terrain, minigame }, event, { voxeloo }) => ({
      terrainRelevantEntityIds: queryForRelevantEntities(
        voxeloo,
        terrain,
        boxToAabb(event.box)
      ),
      minigameCreatorId: minigame.created_by?.id,
      minigameElementIds: [...minigame.minigame_component.minigame_element_ids],
    }),
    involves: (
      event,
      { terrainRelevantEntityIds, minigameElementIds, minigameCreatorId }
    ) => ({
      player: q.id(event.id),
      minigame: q
        .id(event.minigame_id)
        .with("minigame_component")
        .includeIced(),
      newInstanceId: newId(),
      newStashEntityId: newId(),
      minigameInstance:
        event.minigame_instance_id &&
        q.id(event.minigame_instance_id).with("minigame_instance"),
      minigameElements: q.ids(minigameElementIds).with("minigame_element"),
      minigameCreator: q.optional(minigameCreatorId)?.includeIced(),
      stashId: newId(),
      terrain: queryForTerrainInBox(event.box),
      terrainRelevantEntities: q.ids(terrainRelevantEntityIds),
      clonedRelevantEntityIds: newIds(terrainRelevantEntityIds.length),
    }),
    apply: (
      {
        player,
        minigame,
        newInstanceId,
        newStashEntityId,
        minigameInstance,
        stashId,
        terrainRelevantEntities,
        clonedRelevantEntityIds,
        minigameElements,
        minigameCreator,
        terrain,
      },
      event,
      context
    ) => {
      if (minigameInstance) {
        addPlayerToMinigameInstance(
          {
            player,
            minigame,
            minigameInstance,
            minigameCreator,
            minigameElements,
            stashEntityId: newStashEntityId,
          },
          context
        );
      } else {
        handleSpleefCreateNew(
          {
            player,
            minigame,
            minigameElements,
            minigameCreator,
            stashEntityId: newStashEntityId,
            newInstanceId: newInstanceId,
          },
          {
            aabb: boxToAabb(event.box),
            clonedRelevantEntityIds,
            relevantEntities: terrainRelevantEntities,
            spaceEntityId: stashId,
            terrain,
          },

          context
        );
      }
    },
  }
);

const hitPlayerEventHandler = makeEventHandler("tagMinigameHitPlayerEvent", {
  involves: (event) => ({
    player: q.id(event.id),
    minigame: q.id(event.minigame_id).with("minigame_component").includeIced(),
    minigameInstance:
      event.minigame_instance_id &&
      q.id(event.minigame_instance_id).with("minigame_instance"),
    hitPlayer: q.id(event.hit_player_id),
  }),
  apply: (
    { player, minigame, minigameInstance, hitPlayer },
    event,
    context
  ) => {
    ok(player.playingMinigame()?.minigame_instance_id === minigameInstance.id);
    ok(player.playingMinigame()?.minigame_id === minigame.id);
    ok(
      hitPlayer.playingMinigame()?.minigame_instance_id === minigameInstance.id
    );
    const spleef = instanceOfStateKind(minigameInstance, "spleef");
    ok(
      spleef.state.instance_state.kind === "playing_round",
      "Not playing round"
    );
    ok(
      spleef.state.instance_state.tag_round_state?.it_player === player.id,
      "Player is not it"
    );

    killPlayer(
      hitPlayer,
      {
        kind: "attack",
        attacker: player.id,
        dir: undefined,
      },
      minigame,
      minigameInstance,
      context
    );
  },
});

export const spleefHandlers = [
  createOrJoinSpleefEventHandler,
  hitPlayerEventHandler,
];
