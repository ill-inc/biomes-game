import { makeEventHandler, RollbackError } from "@/server/logic/events/core";
import { staleOkDistance } from "@/server/logic/events/handlers/distance";
import { q } from "@/server/logic/events/query";
import { secondsSinceEpoch } from "@/shared/ecs/config";

export const acceptChallengeEventHandler = makeEventHandler(
  "acceptChallengeEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      player: q.id(event.id),
      npc: q.id(event.npc_id),
    }),
    apply: ({ player, npc }, event, context) => {
      // TODO: currently we are not enforcing that the player is talking to the correct
      //       type of NPC id here
      if (!player.challenges()?.available.has(event.challenge_id)) {
        throw new RollbackError("Requested challenge was not available");
      }

      if (staleOkDistance(npc, player) > CONFIG.gameMaxTalkDistance) {
        throw new RollbackError("Talking distance is too large");
      }

      player.mutableChallenges()?.in_progress.add(event.challenge_id);
      player
        .mutableChallenges()
        ?.started_at.set(event.challenge_id, secondsSinceEpoch());
      player.mutableChallenges()?.available.delete(event.challenge_id);
      context.publish({
        kind: "challengeUnlocked",
        entityId: player.id,
        challenge: event.challenge_id,
      });
    },
  }
);

export const completeQuestStepAtEntityEventHandler = makeEventHandler(
  "completeQuestStepAtEntityEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      player: q.id(event.id),
      claimFromEntity: q.id(event.entity_id).with("position"),
    }),
    apply: ({ player, claimFromEntity }, event, context) => {
      if (
        staleOkDistance(claimFromEntity, player) > CONFIG.gameMaxTalkDistance
      ) {
        throw new RollbackError("Talking distance is too large");
      }

      const isRobot = !!claimFromEntity.robotComponent();
      const creatorId = claimFromEntity.createdBy()?.id;
      if (isRobot && creatorId === player.id) {
        context.publish({
          kind: "completeQuestStepAtMyRobot",
          challenge: event.challenge_id,
          entityId: player.id,
          chosenRewardIndex: event.chosen_reward_index,
          stepId: event.step_id,
        });
      }

      context.publish({
        kind: "completeQuestStepAtEntity",
        challenge: event.challenge_id,
        claimFromEntityId: claimFromEntity.id,
        entityId: player.id,
        chosenRewardIndex: event.chosen_reward_index,
        stepId: event.step_id,
      });
    },
  }
);

export const resetChallengeEventHandler = makeEventHandler(
  "resetChallengeEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      player: q.id(event.id),
    }),
    apply: ({ player }, event) => {
      if (!player.challenges()?.in_progress.has(event.challenge_id)) {
        return;
      }
      player.mutableChallenges()?.in_progress.delete(event.challenge_id);
      player.mutableChallenges()?.available.add(event.challenge_id);
      player.mutableTriggerState().by_root.delete(event.challenge_id);
    },
  }
);
