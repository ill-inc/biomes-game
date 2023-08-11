import {
  TalkDialogModal,
  TalkToNpcQuestView,
} from "@/client/components/challenges/TalkDialogModal";
import { TalkDialogModalStep } from "@/client/components/challenges/TalkDialogModalStep";
import type { QuestStepBundle } from "@/client/components/challenges/helpers";
import { useRelevantStepsForEntity } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { BiomesId } from "@/shared/ids";
import { useState } from "react";

export const TalkToNPCMultiQuestSelector: React.FunctionComponent<{
  npcId: BiomesId;
  onClose: () => void;
  onStepComplete: (stepId: BiomesId, questId: BiomesId) => unknown;
}> = ({ npcId, onClose, onStepComplete }) => {
  const { reactResources } = useClientContext();
  const relevantSteps = useRelevantStepsForEntity(npcId);
  const questGiver = reactResources.use("/ecs/c/quest_giver", npcId);
  const maxConcurrentQuests = questGiver?.concurrent_quests ?? 0;

  const inProgressFromNPC = relevantSteps.filter(
    (step) =>
      step.questBundle.biscuit.questGiver === npcId &&
      step.questBundle.state === "in_progress"
  );

  // If we have more quests in progress than the max concurrent quests, from this npc, don't show available quests from this npc.
  const disabled =
    !!maxConcurrentQuests && inProgressFromNPC.length >= maxConcurrentQuests;

  const [id, _setId] = useState(0);
  const [stepBundle, setStepBundle] = useState<QuestStepBundle | undefined>();
  if (stepBundle) {
    return (
      <TalkToNpcQuestView
        talkingToNPCId={npcId}
        stepBundle={stepBundle}
        onClose={onClose}
        onStepComplete={onStepComplete}
      />
    );
  }

  return (
    <TalkDialogModal entityId={npcId}>
      <TalkDialogModalStep
        id={id}
        entityId={npcId}
        buttonLayout={"vertical"}
        dialog={[
          {
            text: questGiver?.concurrent_quest_dialog
              ? questGiver.concurrent_quest_dialog
              : "What would you like to talk about?",
            actions: relevantSteps
              .filter((stepBundle) => !stepBundle.stepCompleted)
              .map((step) => ({
                name: `${step.stepCompleted ? "Remind me about" : ""} ${
                  step.questBundle.biscuit.displayName
                }...`,
                type: "primary",
                disabled,
                tooltip: disabled
                  ? `I can only give you up to ${maxConcurrentQuests} quests at a time`
                  : "",
                onPerformed: () => {
                  setStepBundle(step);
                },
              })),
          },
        ]}
      />
    </TalkDialogModal>
  );
};
