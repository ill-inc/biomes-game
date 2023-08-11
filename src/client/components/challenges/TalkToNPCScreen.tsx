import type { QuestStepBundle } from "@/client/components/challenges/helpers";
import {
  shouldCloseDialog,
  useRelevantStepsForEntity,
} from "@/client/components/challenges/helpers";
import {
  TalkToNpc,
  TalkToNpcQuestView,
} from "@/client/components/challenges/TalkDialogModal";
import { TalkToNpcDefaultDialog } from "@/client/components/challenges/TalkToNPCDefaultDialog";

import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { DialogButton } from "@/client/components/system/DialogButton";

import { becomeTheNPC } from "@/client/game/scripts/become_npc";
import { useWithUnseenEmptyTransition } from "@/client/util/hooks";

import { TalkToNPCMultiQuestSelector } from "@/client/components/challenges/TalkToNPCMultiQuestSelector";
import { JACKIE_ID } from "@/client/util/nux/state_machines";
import { AdminDeleteEvent, AdminIceEvent } from "@/shared/ecs/gen/events";
import { reportFunnelStage } from "@/shared/funnel";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { useEffect, useState } from "react";

export const AdminNPCButtons: React.FunctionComponent<{
  npcId: BiomesId;
}> = ({ npcId }) => {
  const deps = useClientContext();
  const { reactResources, events, userId } = deps;

  const [npcMetadata, label] = reactResources.useAll(
    ["/ecs/c/npc_metadata", npcId],
    ["/ecs/c/label", npcId]
  );

  return (
    <div
      style={{
        position: "absolute",
        top: "1vmin",
        right: "1vmin",
        gap: ".75vmin",
        display: "flex",
        zIndex: 1,
      }}
    >
      <DialogButton
        extraClassNames="btn-inline"
        onClick={() => {
          reactResources.set("/game_modal", {
            kind: "empty",
          });
          void becomeTheNPC(deps, npcId);
        }}
      >
        Become {label?.text ?? "NPC"}
      </DialogButton>
      <DialogButton
        extraClassNames="btn-inline"
        onClick={() => {
          reactResources.set("/game_modal", {
            kind: "empty",
          });

          if (!npcMetadata) return;

          fireAndForget(
            events.publish(
              new (npcMetadata.spawn_event_id
                ? AdminDeleteEvent
                : AdminIceEvent)({
                id: userId,
                entity_id: npcId,
              })
            )
          );
        }}
      >
        Remove NPC from World
      </DialogButton>
    </div>
  );
};

export const TalkToNPCScreen: React.FunctionComponent<{
  talkingToNPCId: BiomesId;
  onClose: () => void;
}> = ({ talkingToNPCId, onClose }) => {
  const clientContext = useClientContext();
  const { resources, gardenHose, authManager } = clientContext;
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");
  const trueRelevantSteps = useRelevantStepsForEntity(talkingToNPCId);
  const [queryingStep, setQueryingStep] = useState(false);
  const [trackedQuest] = clientContext.mapManager.react.useTrackedQuestId();
  const [currentStep, setCurrentStep] = useState<QuestStepBundle | undefined>();
  // Only show stepCompleted steps if they are tracked
  const relevantSteps = useWithUnseenEmptyTransition(
    trueRelevantSteps,
    trueRelevantSteps.length === 0,
    1000
  ).filter((stepBundle) => {
    return !stepBundle.stepCompleted || stepBundle.step.id === trackedQuest;
  });

  useEffect(() => {
    if (talkingToNPCId) {
      gardenHose.publish({
        kind: "talk_npc",
        npcId: talkingToNPCId,
      });
    }
  }, []);

  useEffect(() => {
    if (talkingToNPCId === JACKIE_ID) {
      reportFunnelStage("talkToJackie");
    }
  }, [talkingToNPCId]);

  const onStepComplete = async (stepId: BiomesId, challengeId: BiomesId) => {
    const alreadyOpenQuests = new Set(
      [...trueRelevantSteps].map((e) => e.questBundle.biscuit.id)
    );
    setQueryingStep(true);
    try {
      const closeDialogInfo = await shouldCloseDialog(
        resources,
        talkingToNPCId,
        // Chain to the next quest if it wasn't open at the time of initiating talk to npc
        (newStepId, newChallengeId) =>
          newStepId !== stepId &&
          (challengeId === newChallengeId ||
            !alreadyOpenQuests.has(newChallengeId))
      );

      if (closeDialogInfo.closeDialog) {
        onClose();
      } else {
        setCurrentStep(closeDialogInfo.newStep);
      }
    } finally {
      setQueryingStep(false);
    }
  };

  let dialogContent: JSX.Element;
  if (queryingStep) {
    dialogContent = (
      <TalkToNpc
        talkingToNpcId={talkingToNPCId}
        id={0}
        dialogText=""
        completeStep={() => {}}
      />
    );
  } else if (currentStep) {
    // Some state (like completing a previous quest) continued.
    dialogContent = (
      <TalkToNpcQuestView
        talkingToNPCId={talkingToNPCId}
        stepBundle={currentStep}
        onClose={onClose}
        onStepComplete={onStepComplete}
      />
    );
  } else if (relevantSteps.length === 1) {
    // Exactly 1 quest to talk about. Talk about it directly.
    dialogContent = (
      <TalkToNpcQuestView
        talkingToNPCId={talkingToNPCId}
        stepBundle={relevantSteps[0]}
        onClose={onClose}
        onStepComplete={onStepComplete}
      />
    );
  } else if (relevantSteps.length > 1) {
    // Multiple quests.
    dialogContent = (
      <TalkToNPCMultiQuestSelector
        npcId={talkingToNPCId}
        onClose={onClose}
        onStepComplete={onStepComplete}
      />
    );
  } else {
    dialogContent = (
      <TalkToNpcDefaultDialog
        talkingToNPCId={talkingToNPCId}
        onClose={onClose}
      />
    );
  }

  return (
    <div>
      {isAdmin && <AdminNPCButtons npcId={talkingToNPCId} />}
      {dialogContent}
    </div>
  );
};
