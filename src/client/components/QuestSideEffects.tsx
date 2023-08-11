import {
  NavigationAidForRobotSideEffect,
  NavigationAidSideEffect,
  StepSideEffects,
  useQuestDisplayInfo,
} from "@/client/components/challenges/QuestsHUD";
import { allFirstStepsOfQuest } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { QuestBundle } from "@/client/game/resources/challenges";
import {
  getClosestPlayerCreatedRobot,
  getPlayerCreatedRobots,
} from "@/client/game/util/robots";
import React, { useEffect, useMemo } from "react";

export function findRobotTransmissions(questBundle: QuestBundle) {
  const firstSteps = allFirstStepsOfQuest(questBundle.progress);

  const ret: typeof firstSteps = [];
  for (const step of firstSteps) {
    if (step.payload.kind === "completeQuestStepAtMyRobot") {
      ret.push(step);
    }
  }

  return ret;
}

export const QuestSideEffects: React.FunctionComponent = () => {
  const context = useClientContext();
  const { acceptableQuests, inProgressQuests } = useQuestDisplayInfo();

  const robotTransmissions = useMemo(
    () => acceptableQuests.flatMap((e) => findRobotTransmissions(e)),
    [acceptableQuests]
  );

  useEffect(() => {
    if (robotTransmissions.length === 0) {
      return;
    }
    const nonce = `robotTransmission-${robotTransmissions
      .map((e) => e.id)
      .sort()
      .join("-")}`;
    const robotId = getClosestPlayerCreatedRobot(
      context.table,
      context.userId
    )?.id;

    if (!robotId) {
      return;
    }

    // Cool down to avoid spamming when moving back and forth
    const handle = setTimeout(() => {
      context.notificationsManager.showLocalMessage(
        {
          kind: "robotTransmission",
          entityId: robotId,
          count: robotTransmissions.length,
        },
        robotId,
        nonce
      );
    }, 250);

    return () => {
      clearTimeout(handle);
    };
  }, [robotTransmissions]);

  return (
    <>
      {acceptableQuests.map((e) => (
        <NPCChallengeAvailableSideEffect challenge={e} key={e.biscuit.id} />
      ))}
      {inProgressQuests.map(
        (e) =>
          e.progress && (
            <StepSideEffects
              key={e.biscuit.id}
              challenge={e}
              progress={e.progress}
              isActiveStep={e.progress.progressPercentage < 1.0}
            />
          )
      )}
    </>
  );
};

const NPCChallengeAvailableSideEffect: React.FunctionComponent<{
  challenge: QuestBundle;
}> = React.memo(({ challenge }) => {
  const clientContext = useClientContext();
  const { resources, table, userId } = clientContext;
  const firstSteps = allFirstStepsOfQuest(challenge.progress);

  if (challenge.biscuit.questCategory === "discover") return <></>;

  return (
    <>
      {firstSteps.map((step) => {
        if (step.payload.kind === "challengeClaimRewards") {
          if (!step.payload.returnQuestGiverId) {
            return <React.Fragment key={step.id}></React.Fragment>;
          }
          const npcEntity = resources.get(
            "/ecs/entity",
            step.payload.returnQuestGiverId
          );
          if (!npcEntity) {
            return <React.Fragment key={step.id}></React.Fragment>;
          }

          return (
            <NavigationAidSideEffect
              key={step.id}
              aidId={step.id}
              navigationAid={{
                target: { kind: "entity", id: npcEntity.id },
                kind: challenge.biscuit.questCategory
                  ? challenge.biscuit.questCategory
                  : "unaccepted_quest",
                autoremoveWhenNear: false,
                challengeId: challenge.biscuit.id,
              }}
            />
          );
        }

        if (step.payload.kind === "completeQuestStepAtMyRobot") {
          const playerRobots = Array.from(
            getPlayerCreatedRobots(table, userId)
          );
          return playerRobots.map((robot) => (
            <NavigationAidForRobotSideEffect
              key={robot.id}
              aidId={step.id}
              challengeId={challenge.biscuit.id}
            />
          ));
        }

        return <React.Fragment key={step.id}></React.Fragment>;
      })}
    </>
  );
});
