import { QuestStepDescription } from "@/client/components/challenges/QuestStepDescription";
import { Typer } from "@/client/components/challenges/Typer";
import {
  findHighlights,
  getEntityDisplayName,
  getLatestFinishedDialogStepForNpc,
  isTalkingStep,
  removeTagsInDescription,
  unslugNpcDescription,
} from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import type {
  QuestBundle,
  TriggerProgress,
} from "@/client/game/resources/challenges";
import { replaceDialogKeys } from "@/client/util/text_helpers";

import type { ItemBag } from "@/shared/game/types";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { mapMap } from "@/shared/util/collections";
import { AnimatePresence, motion } from "framer-motion";
import React, { useMemo } from "react";

export const NpcDialogView: React.FunctionComponent<{
  text: string;
  onTypeComplete: () => void;
  beginTyping: boolean;
  shouldFinishTyping: boolean;
}> = ({ text, onTypeComplete, beginTyping, shouldFinishTyping }) => {
  const { table, userId } = useClientContext();
  const filledText = useMemo(
    () => replaceDialogKeys(table, userId, text),
    [text]
  );

  return (
    <Typer
      key={text}
      string={filledText}
      extraClassNames="challenge-description tracking-wide"
      onTypeComplete={onTypeComplete}
      beginTyping={beginTyping}
      shouldFinishTyping={shouldFinishTyping}
    />
  );
};

type ChallengeState = "default" | "rewardable" | "unaccepted" | undefined;

const TriggerProgressComponent: React.FunctionComponent<{
  progress: TriggerProgress;
  index: number;
  type?: ChallengeState;
}> = ({ progress, index, type }) => {
  if (isTalkingStep(progress) && type == "unaccepted" && index != 0)
    return <></>;
  if ((progress.children ?? []).length === 0) {
    return (
      <div key={index} className="challenge-step">
        {progress.progressString}
      </div>
    );
  } else {
    return (
      <div className="steps">
        {progress.children!.map((child, i) => (
          <TriggerProgressComponent
            key={i}
            progress={child}
            index={i}
            type={type}
          />
        ))}
      </div>
    );
  }
};

export const ItemBagDisplay: React.FunctionComponent<{
  bag: ItemBag;
  drawBorder?: boolean;
  onClick?: () => any;
  cellClassName?: string;
}> = ({ bag, drawBorder, cellClassName, onClick }) => {
  if (!bag || bag.size === 0) {
    return <></>;
  }

  return (
    <div
      onClick={onClick}
      className={`flex justify-center gap-0.6 ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <>
        {mapMap(bag, (item, i) => {
          return (
            <ItemTooltip item={item.item} key={i} willTransform={true}>
              <div
                className={`${cellClassName} cell unstyled biomes-box cursor-inherit rounded-l ${
                  drawBorder ? "shadow-[0_0_0_0.2vmin_white]" : ""
                }`}
              >
                <InventoryCellContents slot={item} />
              </div>
            </ItemTooltip>
          );
        })}
      </>
    </div>
  );
};

const QuestSheetObjectives: React.FunctionComponent<{
  step: TriggerProgress;
}> = ({ step }) => {
  const completed = step.progressPercentage === 1;
  return (
    <div>
      <div className={`${completed ? "line-through opacity-50" : ""}`}>
        {step.progressString}
      </div>
    </div>
  );
};

export const DecoratedNpcText: React.FunctionComponent<{
  text: string;
  className?: string;
  highlightClass?: string;
}> = ({ text, className, highlightClass }) => {
  const clientContext = useClientContext();

  return (
    <>
      {unslugNpcDescription(clientContext, text).map((line, index) => {
        const cleanDialog = removeTagsInDescription(line);
        const [letters, highlightedLetterIndices] = findHighlights(
          Array.from(cleanDialog)
        );
        return (
          <div key={index}>
            {letters.map((letter, i) => (
              <span
                key={i}
                className={`${
                  highlightedLetterIndices.includes(i)
                    ? `text-yellow ${highlightClass}`
                    : ""
                } ${className ? className : ""}`}
              >
                {letter}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
};

export const TalkToNpcStepDetails: React.FunctionComponent<{
  step: TriggerProgress;
}> = ({ step }) => {
  const npcEntity = useCachedEntity(
    step.payload.kind === "challengeClaimRewards"
      ? step.payload.returnQuestGiverId
      : undefined
  );
  const displayName = getEntityDisplayName(step, npcEntity);

  if (!isTalkingStep(step)) {
    return <QuestSheetObjectives step={step} />;
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-1 font-semibold">
        <EntityProfilePic entityId={npcEntity?.id ?? INVALID_BIOMES_ID} />

        {displayName}
      </div>
      <div className="flex flex-col gap-1">
        <DecoratedNpcText
          className="font-medium"
          text={step.description ?? ""}
        />
      </div>
    </div>
  );
};

export const LastNpcDialogTooltipContent: React.FunctionComponent<{
  quest: QuestBundle;
}> = ({ quest }) => {
  const { resources } = useClientContext();
  const lastDialogStep = getLatestFinishedDialogStepForNpc(
    resources,
    quest.progress
  );
  const npc = useCachedEntity(
    lastDialogStep?.payload.kind === "challengeClaimRewards"
      ? lastDialogStep.payload.returnQuestGiverId
      : INVALID_BIOMES_ID
  );

  const displayName = lastDialogStep
    ? getEntityDisplayName(lastDialogStep, npc)
    : "Unknown";

  if (!lastDialogStep || !isTalkingStep(lastDialogStep)) {
    return <></>;
  }
  return (
    <div className="flex flex-col gap-1 tracking-normal">
      <div className="text-marge">{displayName} said...</div>
      <DecoratedNpcText
        text={lastDialogStep.description ?? ""}
        className="text-shadow-drop"
      />

      {quest.progress && (
        <div className="mt-1 flex flex-col gap-0.6">
          <div>Objective</div>
          <QuestHUDSteps progress={quest.progress} className="text-sm" />
        </div>
      )}
    </div>
  );
};

export const QuestHUDSteps: React.FunctionComponent<{
  progress: TriggerProgress;
  className?: string;
  containerClassName?: string;
}> = React.memo(({ progress, className, containerClassName }) => {
  let activeStepShown = false;

  const showCompletedSteps =
    progress?.payload.kind === "all" || progress?.payload.kind === "any";

  return (
    <motion.div layout className={`${containerClassName}`}>
      <AnimatePresence mode="wait" initial={false}>
        {(progress.children ?? []).length > 0 ? (
          progress.children?.map((child) => {
            if (child.progressPercentage < 1 || showCompletedSteps) {
              if (
                child.children?.length &&
                (showCompletedSteps || !activeStepShown) &&
                !child.name
              ) {
                activeStepShown = true;
                return (
                  <QuestHUDSteps
                    key={child.id}
                    containerClassName={containerClassName}
                    className={className}
                    progress={child}
                  />
                );
              } else if (showCompletedSteps || !activeStepShown) {
                activeStepShown = true;
                return (
                  <QuestStepDescription
                    key={child.id}
                    triggerProgress={child}
                    className={className}
                  />
                );
              }
            }
          })
        ) : (
          <QuestStepDescription
            key={progress.id}
            triggerProgress={progress}
            className={className}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});
