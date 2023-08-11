import { makeEventHandler, newId } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { handleDeathmatchCreateNew } from "@/server/shared/minigames/deathmatch/util";
import { addPlayerToMinigameInstance } from "@/server/shared/minigames/util";

const joinDeathmatchEventHandler = makeEventHandler("joinDeathmatchEvent", {
  prepareInvolves: (event) => ({
    minigame: q.id(event.minigame_id).with("minigame_component").includeIced(),
  }),
  prepare: ({ minigame }) => ({
    minigameElementIds: [...minigame.minigame_component.minigame_element_ids],
    minigameCreatorId: minigame.created_by?.id,
  }),
  involves: (event, { minigameElementIds, minigameCreatorId }) => ({
    player: q.id(event.id),
    minigame: q.id(event.minigame_id).with("minigame_component").includeIced(),
    minigameCreator: q.optional(minigameCreatorId)?.includeIced(),
    minigameElements: q
      .ids(minigameElementIds)
      .with("minigame_element")
      .optional(),
    newInstanceId: newId(),
    newStashEntityId: newId(),
    minigameInstance:
      event.minigame_instance_id &&
      q.id(event.minigame_instance_id).with("minigame_instance").includeIced(),
  }),
  apply: (
    {
      player,
      minigame,
      minigameElements,
      newInstanceId,
      newStashEntityId,
      minigameCreator,
      minigameInstance,
    },
    _event,
    context
  ) => {
    if (minigameInstance) {
      addPlayerToMinigameInstance(
        {
          player,
          minigame,
          minigameInstance,
          minigameElements,
          minigameCreator,
          stashEntityId: newStashEntityId,
        },
        context
      );
    } else {
      handleDeathmatchCreateNew(
        {
          player,
          minigame,
          minigameElements,
          minigameCreator,
          stashEntityId: newStashEntityId,
          newInstanceId: newInstanceId,
        },
        context
      );
    }
  },
});

export const deathmatchHandlers = [joinDeathmatchEventHandler];
