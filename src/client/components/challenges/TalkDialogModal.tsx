import type { QuestStepBundle } from "@/client/components/challenges/helpers";
import { unslugNpcDescription } from "@/client/components/challenges/helpers";
import { ItemBagDisplay } from "@/client/components/challenges/QuestViews";
import type {
  ButtonLayout,
  TalkDialogInfo,
  TalkDialogStepAction,
} from "@/client/components/challenges/TalkDialogModalStep";
import { TalkDialogModalStep } from "@/client/components/challenges/TalkDialogModalStep";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { getOwnedItems } from "@/client/components/inventory/helpers";
import { ChromelessModal } from "@/client/components/modals/ChromelessModal";
import type { ClientContextSubset } from "@/client/game/context";
import {
  AcceptChallengeEvent,
  CompleteQuestStepAtEntityEvent,
} from "@/shared/ecs/gen/events";
import { determineTakePattern } from "@/shared/game/inventory";
import type { ItemBag } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useState } from "react";

const talkToItemDisplayContainerClasses = "flex justify-center gap-0.6";
const talkToItemDisplayCellClasses = "bg-tooltip-bg w-10 h-10";

export const TalkDialogModal: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
  }>
> = ({ entityId, children }) => {
  const { resources } = useClientContext();
  useEffect(() => {
    resources.update("/scene/local_player", (localPlayer) => {
      localPlayer.talkingToNpc = entityId;
    });
    return () => {
      resources.update("/scene/local_player", (localPlayer) => {
        localPlayer.talkingToNpc = undefined;
      });
    };
  }, []);

  return (
    <ChromelessModal extraClassNames="npc-quest-view">
      <div
        style={{
          cursor: "pointer",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {children}
    </ChromelessModal>
  );
};

export const TalkToNpcQuestView: React.FunctionComponent<{
  talkingToNPCId: BiomesId;
  onStepComplete: (stepId: BiomesId, questId: BiomesId) => unknown;
  onClose: () => void;
  stepBundle: QuestStepBundle;
}> = ({ talkingToNPCId, stepBundle, onClose, onStepComplete }) => {
  const { userId, events } = useClientContext();

  const questId = stepBundle.questBundle.biscuit.id;
  const stepId = stepBundle.step.id;

  const acceptQuest = useCallback((challengeId: BiomesId) => {
    if (stepBundle.stepCompleted) {
      onClose();
      return;
    }

    fireAndForget(
      (async () => {
        await events.publish(
          new AcceptChallengeEvent({
            id: userId,
            challenge_id: challengeId,
            npc_id: talkingToNPCId,
          })
        );
        onStepComplete(stepId, challengeId);
      })()
    );
  }, []);

  const completeStep = async (chosenRewardIndex?: number) => {
    if (stepBundle.stepCompleted) {
      onClose();
      return;
    }
    if (stepBundle.isFirstStep) {
      acceptQuest(questId);
    }

    await events.publish(
      new CompleteQuestStepAtEntityEvent({
        id: userId,
        challenge_id: questId,
        entity_id: talkingToNPCId,
        chosen_reward_index: chosenRewardIndex,
        step_id: stepId,
      })
    );

    onStepComplete(stepId, questId);
  };

  const additionalActions = stepBundle.canDecline
    ? [getDeclineAction(onClose, stepBundle.declineText || "No, Thanks")]
    : [];

  if (stepBundle.rewardsList?.length) {
    return (
      <TalkToNpcWithRewards
        talkingToNpcId={talkingToNPCId}
        id={stepId}
        dialogText={stepBundle.dialogText}
        completeStep={completeStep}
        advanceText={stepBundle.acceptText}
        rewards={stepBundle.rewardsList}
        additionalActions={additionalActions}
      />
    );
  } else if (stepBundle.itemsToTake?.size) {
    return (
      <TalkToNpcWithTakeItems
        talkingToNpcId={talkingToNPCId}
        id={stepId}
        dialogText={stepBundle.dialogText}
        itemsToTake={stepBundle.itemsToTake}
        completeStep={completeStep}
        advanceText={stepBundle.acceptText}
        onClose={onClose}
        additionalActions={additionalActions}
      />
    );
  } else {
    return (
      <TalkToNpc
        talkingToNpcId={talkingToNPCId}
        id={stepId}
        dialogText={stepBundle.dialogText}
        completeStep={completeStep}
        advanceText={stepBundle.acceptText}
        additionalActions={additionalActions}
      />
    );
  }
};

export const textAndFinalStepToDialog = ({
  clientContext,
  text,
  actions,
  children,
}: {
  clientContext: ClientContextSubset<"reactResources">;
  text: string;
  actions?: TalkDialogStepAction[];
  children?: React.ReactNode;
}): TalkDialogInfo[] => {
  const parsedText = unslugNpcDescription(clientContext, text);

  return parsedText.map((text, index) => {
    const isLastStep = index === parsedText.length - 1;
    if (isLastStep) {
      return {
        text,
        actions,
        children,
      };
    } else {
      return {
        text,
      };
    }
  });
};

const getDeclineAction = (
  onClose: () => void,
  declineText?: string
): TalkDialogStepAction => ({
  name: declineText ?? "No, Thanks",
  type: "normal",
  onPerformed: onClose,
});

export const TalkToNpc: React.FunctionComponent<{
  id: BiomesId | number | string;
  talkingToNpcId: BiomesId;
  completeStep: () => unknown;
  dialogText: string;
  advanceText?: string;
  children?: React.ReactNode;
  buttonLayout?: ButtonLayout;
  additionalActions?: TalkDialogStepAction[];
}> = ({
  id,
  talkingToNpcId,
  dialogText,
  completeStep,
  advanceText,
  children,
  buttonLayout,
  additionalActions,
}) => {
  const clientContext = useClientContext();
  return (
    <TalkDialogModal entityId={talkingToNpcId}>
      <TalkDialogModalStep
        id={id}
        entityId={talkingToNpcId}
        buttonLayout={buttonLayout}
        dialog={textAndFinalStepToDialog({
          clientContext,
          text: dialogText,
          actions: [
            ...(additionalActions ?? []),
            {
              name: advanceText || "Continue",
              type: "primary",
              disabled: false,
              onPerformed: completeStep,
            },
          ],
          children,
        })}
      />
    </TalkDialogModal>
  );
};

export const TalkToItemDisplay: React.FunctionComponent<{
  containerClassName?: string;
  cellClassName?: string;
  items: ItemBag[];
  chosenItemIndex?: number;
  setChosenItemIndex?: (i: number) => void;
}> = ({
  containerClassName,
  cellClassName,
  items,
  chosenItemIndex,
  setChosenItemIndex,
}) => {
  return (
    <div className={containerClassName}>
      {items.map((item, index) => (
        <ItemBagDisplay
          cellClassName={cellClassName}
          bag={item}
          drawBorder={chosenItemIndex === index && items.length > 1}
          onClick={
            items.length > 1 && setChosenItemIndex
              ? () => setChosenItemIndex(index)
              : undefined
          }
          key={index}
        />
      ))}
    </div>
  );
};

const TalkToNpcWithRewards: React.FunctionComponent<{
  id: BiomesId;
  talkingToNpcId: BiomesId;
  dialogText: string;
  completeStep: (chosenRewardIndex: number) => unknown;
  advanceText?: string;
  rewards: ItemBag[];
  additionalActions?: TalkDialogStepAction[];
}> = ({
  id,
  talkingToNpcId,
  dialogText,
  completeStep,
  advanceText,
  rewards,
  additionalActions,
}) => {
  const clientContext = useClientContext();

  const defaultRewardIndex = rewards.length > 1 ? undefined : 0;
  const [chosenRewardIndex, setChosenRewardIndex] = useState<
    number | undefined
  >(defaultRewardIndex);

  useEffect(() => {
    setChosenRewardIndex(defaultRewardIndex);
  }, [id]);

  const disabled = chosenRewardIndex === undefined;

  const action: TalkDialogStepAction = {
    name: advanceText || "Claim Reward",
    tooltip: disabled ? "Choose a reward to continue" : undefined,
    type: "primary" as const,
    disabled: disabled,
    onPerformed: () => {
      if (disabled) {
        return;
      }
      completeStep(chosenRewardIndex);
    },
  };

  return (
    <TalkDialogModal entityId={talkingToNpcId}>
      <TalkDialogModalStep
        id={id}
        entityId={talkingToNpcId}
        dialog={textAndFinalStepToDialog({
          clientContext,
          text: dialogText,
          actions: [...(additionalActions ?? []), action],
          children: (
            <TalkToItemDisplay
              containerClassName={talkToItemDisplayContainerClasses}
              cellClassName={talkToItemDisplayCellClasses}
              items={rewards}
              chosenItemIndex={chosenRewardIndex}
              setChosenItemIndex={(i) => {
                if (i === chosenRewardIndex) {
                  setChosenRewardIndex(undefined);
                } else {
                  setChosenRewardIndex(i);
                }
              }}
            />
          ),
        })}
      />
    </TalkDialogModal>
  );
};

const TalkToNpcWithTakeItems: React.FunctionComponent<{
  id: BiomesId;
  talkingToNpcId: BiomesId;
  dialogText: string;
  itemsToTake: ItemBag;
  completeStep: () => unknown;
  advanceText?: string;
  onClose: () => unknown;
  additionalActions?: TalkDialogStepAction[];
}> = ({
  id,
  talkingToNpcId,
  dialogText,
  itemsToTake,
  completeStep,
  advanceText,
  onClose,
  additionalActions,
}) => {
  const clientContext = useClientContext();
  const resources = clientContext.resources;
  const ownedItems = getOwnedItems(resources, clientContext.userId);

  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    setErrorMessage(undefined);
  }, []);

  const validateTakeItems = (itemsToTake?: ItemBag): string | undefined => {
    if (!itemsToTake) {
      return undefined;
    }

    const takePattern = determineTakePattern(ownedItems, itemsToTake, {
      respectPayload: false,
    });
    if (!takePattern) {
      return "Hmmm... seems like you don't have all the items I need. Come back when you've got them!";
    }
  };

  const action = {
    name: errorMessage ? "Close" : advanceText || "Turn in Items",
    type: "primary" as const,
    disabled: false,
    onPerformed: () => {
      if (errorMessage) {
        onClose();
        return;
      }

      const takeItemsError = validateTakeItems(itemsToTake);
      if (takeItemsError) {
        setErrorMessage(takeItemsError);
        return;
      }

      completeStep();
    },
  };

  const text = errorMessage ? errorMessage : dialogText;

  return (
    <TalkDialogModal entityId={talkingToNpcId}>
      <TalkDialogModalStep
        id={`${id}-${text.length}`}
        entityId={talkingToNpcId}
        dialog={textAndFinalStepToDialog({
          clientContext,
          text,
          actions: [...(additionalActions ?? []), action],
          children: (
            <TalkToItemDisplay
              containerClassName={talkToItemDisplayContainerClasses}
              cellClassName={talkToItemDisplayCellClasses}
              items={[itemsToTake]}
            />
          ),
        })}
      />
    </TalkDialogModal>
  );
};
