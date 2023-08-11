import {
  isRewardsClaimable,
  useAvailableOrInProgressChallenges,
} from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { NavigationAidSpec } from "@/client/game/helpers/navigation_aids";
import type {
  QuestBundle,
  TriggerProgress,
} from "@/client/game/resources/challenges";
import React, { useEffect, useMemo } from "react";

import { MINI_MAP_WIDTH } from "@/client/components/MiniMapHUD";
import {
  LastNpcDialogTooltipContent,
  QuestHUDSteps,
} from "@/client/components/challenges/QuestViews";
import { usePlayerCreatedRobots } from "@/client/components/map/hooks";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { xzUnproject } from "@/shared/math/linear";
import { assertNever } from "@/shared/util/type_helpers";
import { first } from "lodash";
import pluralize from "pluralize";

export const QUEST_HUD_DEFAULT_NUMBER_TO_SHOW = 1;

export const NavigationAidForRobotSideEffect: React.FunctionComponent<{
  aidId: BiomesId;
  challengeId?: BiomesId;
}> = React.memo(({ aidId, challengeId }) => {
  const { mapManager, reactResources } = useClientContext();
  const playerRobots = usePlayerCreatedRobots(1);
  const closestPlayerRobotId = first(Array.from(playerRobots));

  const lockedInPlace = reactResources.maybeUse(
    Boolean(closestPlayerRobotId),
    "/ecs/c/locked_in_place",
    closestPlayerRobotId ?? INVALID_BIOMES_ID
  );

  useEffect(() => {
    if (closestPlayerRobotId && lockedInPlace) {
      const bid = mapManager.addNavigationAid(
        {
          kind: "quest",
          autoremoveWhenNear: false,
          target: {
            kind: "robot",
            id: closestPlayerRobotId,
          },
          challengeId,
        },
        aidId
      );
      return () => {
        mapManager.removeNavigationAid(bid);
      };
    }
  }, [closestPlayerRobotId, lockedInPlace]);

  return <></>;
});

export const NavigationAidSideEffect: React.FunctionComponent<{
  navigationAid: NavigationAidSpec;
  aidId: BiomesId;
}> = React.memo(({ navigationAid, aidId }) => {
  const { mapManager } = useClientContext();
  useEffect(() => {
    const bid = mapManager.addNavigationAid(navigationAid, aidId);
    return () => {
      mapManager.removeNavigationAid(bid);
    };
  }, [navigationAid.target.kind]);

  return <></>;
});

const NavigationAidSideEffects: React.FunctionComponent<{
  challenge: QuestBundle;
  isActiveStep: boolean;
  progress: TriggerProgress;
}> = React.memo(({ challenge, isActiveStep, progress }) => {
  if (!progress.navigationAid || !isActiveStep) {
    return <></>;
  }

  let clientAidTarget: NavigationAidSpec["target"];
  switch (progress.navigationAid.kind) {
    case "position":
      clientAidTarget = {
        kind: "position",
        position: progress.navigationAid.pos,
      };
      break;
    case "npc":
      clientAidTarget = {
        kind: "npc",
        typeId: progress.navigationAid.npcTypeId,
      };
      break;
    case "entity":
      clientAidTarget = {
        kind: "entity",
        id: progress.navigationAid.id,
      };
      break;
    case "group":
      clientAidTarget = {
        kind: "group",
        groupId: progress.navigationAid.groupId,
      };
      break;
    case "robot":
      return (
        <NavigationAidForRobotSideEffect
          key={progress.id}
          aidId={progress.id}
          challengeId={challenge.biscuit.id}
        />
      );

    // TODO: remove me
    case "active_campsite":
    case "plot":
    case "deed":
      break;
    default:
      assertNever(progress.navigationAid);
  }
  return (
    <NavigationAidSideEffect
      key={progress.id}
      aidId={progress.id}
      navigationAid={{
        kind: "quest",
        autoremoveWhenNear: false,
        target: clientAidTarget!,
        challengeId: challenge.biscuit.id,
      }}
    />
  );
});

export const StepSideEffects: React.FunctionComponent<{
  challenge: QuestBundle;
  isActiveStep: boolean;
  progress: TriggerProgress;
}> = React.memo(({ challenge, isActiveStep, progress }) => {
  switch (progress.payload.kind) {
    case "all":
    case "any":
      return (
        <>
          <NavigationAidSideEffects
            challenge={challenge}
            isActiveStep={isActiveStep}
            progress={progress}
          />
          {progress.children!.map((child) => (
            <StepSideEffects
              key={child.id}
              challenge={challenge}
              progress={child}
              isActiveStep={
                isActiveStep &&
                progress.progressPercentage < 1.0 &&
                child.progressPercentage < 1.0
              }
            />
          ))}
        </>
      );

    case "seq":
      for (const child of progress.children!) {
        if (child.progressPercentage < 1.0) {
          return (
            <>
              <NavigationAidSideEffects
                challenge={challenge}
                isActiveStep={isActiveStep}
                progress={progress}
              />
              <StepSideEffects
                key={child.id}
                challenge={challenge}
                progress={child}
                isActiveStep={
                  isActiveStep &&
                  progress.progressPercentage < 1.0 &&
                  child.progressPercentage < 1.0
                }
              />
            </>
          );
        }
      }
      return <></>;

    case "challengeClaimRewards":
      const showDefaultNavigationAid =
        isActiveStep &&
        !progress.navigationAid &&
        progress.payload.allowDefaultNavigationAid;
      if (
        progress &&
        isRewardsClaimable(challenge) &&
        progress.payload.returnQuestGiverId
      ) {
        return (
          <>
            <NavigationAidSideEffects
              challenge={challenge}
              isActiveStep={isActiveStep}
              progress={progress}
            />
            {showDefaultNavigationAid && (
              <NavigationAidSideEffect
                aidId={progress.id}
                navigationAid={{
                  target: {
                    kind: "entity",
                    id: progress.payload.returnQuestGiverId,
                  },
                  kind: "quest",
                  autoremoveWhenNear: false,
                  challengeId: challenge.biscuit.id,
                }}
              />
            )}
          </>
        );
      }
      break;

    case "completeQuestStepAtMyRobot": {
      return (
        <>
          <NavigationAidSideEffects
            challenge={challenge}
            isActiveStep={isActiveStep}
            progress={progress}
          />
          {progress.payload.allowDefaultNavigationAid && (
            <NavigationAidForRobotSideEffect
              aidId={progress.id}
              challengeId={challenge.biscuit.id}
            />
          )}
        </>
      );
      break;
    }

    case "mapBeam":
      {
        const showDefaultNavigationAid =
          isActiveStep &&
          !progress.navigationAid &&
          progress.payload.allowDefaultNavigationAid;
        if (isActiveStep) {
          return (
            <>
              <NavigationAidSideEffects
                challenge={challenge}
                isActiveStep={isActiveStep}
                progress={progress}
              />
              {showDefaultNavigationAid && (
                <NavigationAidSideEffect
                  aidId={progress.id}
                  navigationAid={{
                    target: {
                      kind: "position",
                      position: xzUnproject(progress.payload.location),
                    },
                    kind: "quest",
                    autoremoveWhenNear: true,
                    challengeId: challenge.biscuit.id,
                  }}
                />
              )}
            </>
          );
        }
      }
      break;

    case "approachPosition":
      {
        const showDefaultNavigationAid =
          isActiveStep &&
          !progress.navigationAid &&
          progress.payload.allowDefaultNavigationAid;
        if (isActiveStep) {
          return (
            <>
              <NavigationAidSideEffects
                challenge={challenge}
                isActiveStep={isActiveStep}
                progress={progress}
              />
              {showDefaultNavigationAid && (
                <NavigationAidSideEffect
                  aidId={progress.id}
                  navigationAid={{
                    target: {
                      kind: "position",
                      position: progress.payload.location,
                    },
                    kind: "quest",
                    autoremoveWhenNear: true,
                    challengeId: challenge.biscuit.id,
                  }}
                />
              )}
            </>
          );
        }
      }
      break;
  }

  return (
    <NavigationAidSideEffects
      challenge={challenge}
      isActiveStep={isActiveStep}
      progress={progress}
    />
  );
});

const QuestHUDTitle: React.FunctionComponent<{
  quest: QuestBundle;
}> = ({ quest }) => {
  const { mapManager } = useClientContext();
  const [tracked] = mapManager.react.useTrackingQuestStatus(quest.biscuit.id);
  return (
    <div className="font-semibold text-light-yellow">
      {tracked && <>♦ </>} {quest.biscuit.displayName ?? quest.biscuit.name}
    </div>
  );
};

const QuestHUDTitleAndSteps: React.FunctionComponent<{
  questId: BiomesId;
}> = React.memo(({ questId }) => {
  const { reactResources } = useClientContext();
  const quest = reactResources.useResolved("/quest", questId);

  if (!quest) {
    return <></>;
  }

  return (
    <Tooltipped tooltip={<LastNpcDialogTooltipContent quest={quest} />}>
      <div className="flex flex-col items-end">
        <QuestHUDTitle quest={quest} />
        {quest.progress && (
          <QuestHUDSteps
            containerClassName="flex flex-col items-end"
            className="text-right"
            progress={quest.progress}
          />
        )}
      </div>
    </Tooltipped>
  );
});

export const useQuestDisplayInfo = () => {
  const challenges = useAvailableOrInProgressChallenges();
  const inProgressQuests = useMemo(
    () => challenges.filter((e) => e?.state === "in_progress"),
    [challenges]
  );
  const acceptableQuests = useMemo(
    () =>
      challenges.filter(
        (e) => e?.state === "available" && !!e.biscuit.questGiver
      ),
    [challenges]
  );
  return {
    acceptableQuests,
    inProgressQuests,
  };
};

export const QuestsHUD: React.FunctionComponent<{}> = React.memo(({}) => {
  const { mapManager, reactResources, userId } = useClientContext();
  const inProgressIds =
    reactResources.use("/ecs/c/challenges", userId)?.in_progress ?? new Set();
  const [trackedQuestId] = mapManager.react.useTrackedQuestId();

  const trackedQuest = Boolean(
    trackedQuestId && inProgressIds.has(trackedQuestId)
  );
  const additionalQuests = inProgressIds.size - (trackedQuest ? 1 : 0);

  return (
    <div className="flex w-32 flex-col items-end gap-1 text-shadow-bordered">
      <>
        {trackedQuest && (
          <QuestHUDTitleAndSteps
            key={trackedQuestId}
            questId={trackedQuestId!}
          />
        )}
        {additionalQuests > 0 && (
          <div
            className={`font-semibold text-light-yellow ${MINI_MAP_WIDTH} ${
              trackedQuest ? "text-right" : "text-center"
            }`}
          >
            {additionalQuests} {trackedQuest ? "more " : ""}
            active {pluralize("Quest", additionalQuests)}
          </div>
        )}
      </>
    </div>
  );
});
