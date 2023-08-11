import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { ClientContextSubset } from "@/client/game/context";
import type { Events } from "@/client/game/context_managers/events";
import type {
  QuestBundle,
  TriggerProgress,
  TriggerProgressClaimRewardsPayload,
  TriggerProgressCompleteQuestStepAtRobotPayload,
} from "@/client/game/resources/challenges";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import {
  getClosestPlayerCreatedRobot,
  isCreatedRobot,
} from "@/client/game/util/robots";
import type {
  TranslateRequest,
  TranslateResponse,
} from "@/pages/api/voices/translate";
import { getBiscuit } from "@/shared/bikkie/active";
import type { Envelope } from "@/shared/chat/types";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  AcceptChallengeEvent,
  CompleteQuestStepAtEntityEvent,
} from "@/shared/ecs/gen/events";
import type { ItemBag } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import type { NpcType } from "@/shared/npc/bikkie";
import { idToNpcType, relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { sleep } from "@/shared/util/async";
import { compactMap } from "@/shared/util/collections";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { first, last } from "lodash";
import { useMemo } from "react";

export interface ChallengeStingerBundle {
  kind: "challenge_complete" | "challenge_unlock";
  challenge: QuestBundle;
  message: Envelope;
}

export interface QuestStepBundle {
  questBundle: QuestBundle;
  step: TriggerProgress;
  dialogText: string;
  dialogMode?: "voice" | "text";

  isFirstStep: boolean;
  acceptText?: string;
  declineText?: string;
  canDecline?: boolean;
  stepCompleted?: boolean;

  rewardsList?: ItemBag[];
  itemsToTake?: ItemBag;
}

export function useAvailableRobotSteps() {
  const { table, userId } = useClientContext();

  const robot = getClosestPlayerCreatedRobot(table, userId);
  const steps = useRelevantStepsForEntity(robot?.id);
  const incompleteSteps = steps.filter(
    (s) => !s.stepCompleted && s.questBundle.state === "available"
  );

  return incompleteSteps;
}

export function getAvailableRobotSteps() {
  const { table, userId, resources } = useClientContext();
  const robot = getClosestPlayerCreatedRobot(table, userId);
  const quests = getAvailableOrInProgressChallenges(resources);
  const steps = robot?.id
    ? getRelevantStepsForEntity(resources, quests, robot.id)
    : [];
  const incompleteSteps = steps.filter(
    (s) => !s.stepCompleted && s.questBundle.state === "available"
  );
  return incompleteSteps;
}

export function isTalkingStep(
  step: TriggerProgress
): step is
  | TriggerProgress<TriggerProgressClaimRewardsPayload>
  | TriggerProgress<TriggerProgressCompleteQuestStepAtRobotPayload> {
  const kind = step.payload.kind;
  return (
    kind === "challengeClaimRewards" || kind === "completeQuestStepAtMyRobot"
  );
}

export function useAvailableOrInProgressChallenges() {
  const { reactResources } = useClientContext();
  const challengeResource = reactResources.use(
    "/challenges/available_or_in_progress"
  );
  return challengeResource;
}

export function getAvailableOrInProgressChallenges(
  resources: ClientResources
): QuestBundle[] {
  const challenges = resources.get("/challenges/available_or_in_progress");
  return challenges;
}

export function useRelevantStepsForEntity(
  entityId: BiomesId | undefined
): QuestStepBundle[] {
  const { resources } = useClientContext();
  const quests = useAvailableOrInProgressChallenges();
  return useMemo(() => {
    if (!entityId || !quests) {
      return [];
    }
    return getRelevantStepsForEntity(resources, quests, entityId);
  }, [quests, entityId, resources]);
}

export function getEntityDisplayName(
  step: TriggerProgress,
  npcEntity: ReadonlyEntity | null
): string {
  if (step.payload.kind === "challengeClaimRewards") {
    const npcType = getBiscuit(step.payload.returnQuestGiverId);
    return npcEntity?.label?.text ?? npcType?.displayName ?? "Unknown";
  } else if (step.payload.kind === "completeQuestStepAtMyRobot") {
    return "Your Robot";
  }
  return "Unknown";
}

function getRelevantStepsForEntity(
  resources: ClientResources,
  quests: QuestBundle[],
  entityId: BiomesId
): QuestStepBundle[] {
  const result: QuestStepBundle[] = [];

  for (const quest of quests) {
    if (quest.state === "locked" || quest.state === "completed") {
      continue;
    }
    const steps = allAppropriateStepsForEntity(
      resources,
      quest.progress,
      entityId
    );

    const activeSteps = compactMap(steps, (step) => {
      if (!isTalkingStep(step)) {
        return;
      }
      const isFirstStep = isFirstStepOfQuest(step, quest.progress);
      return {
        questBundle: quest,
        step,
        dialogText: step.description ?? "",
        isFirstStep,
        acceptText: step.payload.acceptText,
        declineText: step.payload.declineText,
        canDecline: isFirstStep && quest.biscuit.questCategory !== "main",
        rewardsList: step.payload.rewardsList,
        itemsToTake: step.payload.itemsToTake,
      };
    });
    result.push(...activeSteps);

    if (activeSteps.length === 0) {
      const triggerProgress = getLatestFinishedDialogStepForNpc(
        resources,
        quest.progress,
        entityId
      );
      if (triggerProgress) {
        result.push({
          questBundle: quest,
          step: triggerProgress,
          dialogText: triggerProgress.description ?? "",
          isFirstStep: false,
          stepCompleted: true,
        });
      }
    }
  }

  return result;
}

// Is `step` a possible first step of `progress`?
export function isFirstStepOfQuest(
  step: TriggerProgress,
  progress?: TriggerProgress
): boolean {
  const allFirstSteps = allFirstStepsOfQuest(progress);
  return !!allFirstSteps.find((s) => s.id === step.id);
}

export function allFirstStepsOfQuest(
  progress?: TriggerProgress
): TriggerProgress[] {
  if (!progress) {
    return [];
  }
  if (!progress?.children || progress.children.length === 0) {
    return [progress];
  }

  const kind = progress.payload.kind;
  const children = progress.children;
  if (kind === "seq") {
    const firstChild = first(children);
    if (firstChild) {
      return allFirstStepsOfQuest(firstChild);
    }
  }
  if (kind === "all" || kind === "any") {
    return progress.children.flatMap((child) => allFirstStepsOfQuest(child));
  }
  return [];
}

// Removes tags such as <text></text> from the description string.
export function removeTagsInDescription(description: string): string {
  return description.replace(/<\/?[^>]+>/g, "");
}

export function spokenDialogInDescription(description: string): string {
  return description
    .replaceAll("**", "")
    .replaceAll(/<text>(.*?)<\/text>/g, "")
    .trim();
}

export function replaceUsernameInDescription(
  deps: ClientContextSubset<"reactResources">,
  description: string
): string {
  const localPlayer = deps.reactResources.get("/scene/local_player");
  return description.replace("{username}", localPlayer.player.username);
}

export function unslugNpcDescription(
  deps: ClientContextSubset<"reactResources">,
  description?: string
): string[] {
  if (description === undefined) {
    return [];
  }

  const newDescription = replaceUsernameInDescription(deps, description).split(
    `{break}`
  );

  return newDescription;
}

export function defaultDialogForNpc(
  resources: ClientResources | ClientReactResources,
  entityId: BiomesId
) {
  const dialogComponent = resources.get("/ecs/c/default_dialog", entityId);
  const biscuit = relevantBiscuitForEntityId(
    resources as ClientResources,
    entityId
  );

  if (biscuit?.isMount) {
    return "I wonder what it would say...";
  }

  return (
    dialogComponent?.text ??
    "I'm a little busy right now. Try talking to someone else if you're looking for something to do."
  );
}

export function getClaimableRewardsTrigger(
  progress: TriggerProgress
): TriggerProgress<TriggerProgressClaimRewardsPayload> | undefined {
  // TODO: this is a buggy implementation since it ignores 'all' vs. 'seq'
  for (const trigger of progress?.children ?? []) {
    if (
      trigger.payload.kind === "challengeClaimRewards" &&
      trigger.progressPercentage < 1.0
    ) {
      return trigger as TriggerProgress<TriggerProgressClaimRewardsPayload>;
    }
  }

  return undefined;
}

export function isRewardsClaimable(challenge: QuestBundle) {
  // TODO: this is a buggy implementation since it ignores 'all' vs. 'seq'
  for (const trigger of challenge.progress?.children ?? []) {
    if (isTalkingStep(trigger)) {
      return true;
    } else if (trigger.progressPercentage < 1.0) {
      return false;
    }
  }

  return false;
}

export function npcTypeForNpcId(
  resources: ClientResources | ClientReactResources,
  npcId?: BiomesId
): NpcType | undefined {
  if (!npcId) {
    return undefined;
  }

  const npcMetadata = resources.get("/ecs/c/npc_metadata", npcId);
  if (!npcMetadata) {
    return undefined;
  }

  return idToNpcType(npcMetadata.type_id);
}

function allAppropriateStepsForEntity(
  resources: ClientResources,
  progress: TriggerProgress | undefined,
  entityId: BiomesId
): TriggerProgress[] {
  if (!progress) {
    return [];
  }
  const isLeafNode = !progress.children;
  if (isLeafNode) {
    if (progress.progressPercentage === 1) {
      return [];
    }
    return [progress];
  }

  const isRobot = isCreatedRobot(resources, entityId);
  const kind = progress.payload.kind;
  const allSteps = progress.children;

  const result: TriggerProgress[] = [];

  for (const step of allSteps ?? []) {
    const appropriateStepsForStep = allAppropriateStepsForEntity(
      resources,
      step,
      entityId
    );
    result.push(
      ...appropriateStepsForStep.filter((step) => {
        if (isRobot) {
          return step.payload.kind === "completeQuestStepAtMyRobot";
        } else {
          return (
            step.payload.kind === "challengeClaimRewards" &&
            step.payload.returnQuestGiverId === entityId
          );
        }
      })
    );
    // If it is a seq, then you cannot do any following steps.
    // Don't check with the filtered steps here because even if there is a step to
    // be completed that is not talking to the NPC, we still want to return early.
    if (kind === "seq" && step.progressPercentage < 1.0) {
      break;
    }
  }

  return result;
}

// For a given challenge and NPC that the player is talking to,
// get the latest dialog that the player has already seen.
export function getLatestFinishedDialogStepForNpc(
  resources: ClientResources,
  progress?: TriggerProgress,
  entityId?: BiomesId
): TriggerProgress | undefined {
  const validSteps = getAllCompletedSteps(progress).filter((step) => {
    if (!isTalkingStep(step)) {
      return false;
    }
    if (!entityId) {
      return true;
    }
    const isEntityRobot = isCreatedRobot(resources, entityId);
    if (
      step.payload.kind === "challengeClaimRewards" &&
      !isEntityRobot &&
      entityId !== step.payload.returnQuestGiverId
    ) {
      return false;
    }
    if (step.payload.kind === "completeQuestStepAtMyRobot") {
      if (!isEntityRobot) {
        return false;
      }
    }
    return true;
  });

  return last(validSteps);
}

export function getAllCompletedSteps(
  progress?: TriggerProgress
): TriggerProgress[] {
  if (!progress) {
    return [];
  }
  const kind = progress.payload.kind;
  if (kind !== "all" && kind !== "any" && kind !== "seq") {
    if (progress.progressPercentage !== 1) {
      return [];
    }
    return [progress];
  }
  // Respect name overrides.
  if (progress.name) {
    return [progress];
  }

  let completed: TriggerProgress[] = [];
  for (const child of progress.children ?? []) {
    completed = [...completed, ...getAllCompletedSteps(child)];
  }
  return completed;
}

// Steps of a quest that the player can see.
// Includes the completed steps and the next steps for the player to complete.
export function viewableStepsForChallenge(
  progress?: TriggerProgress
): TriggerProgress[] {
  return [
    ...getAllCompletedSteps(progress),
    ...stepsToDoForChallenge(progress).filter(
      // Don't show the Talk to NPC steps that are to be completed.
      (step) => !isTalkingStep(step)
    ),
  ];
}

// The next steps for the player to do.
export function stepsToDoForChallenge(
  progress?: TriggerProgress
): TriggerProgress[] {
  const kind = progress?.payload.kind;
  if (kind === "seq" || kind === "all" || kind === "any") {
    if (progress?.name) {
      return [progress];
    }
    if (kind === "all" || kind === "any") {
      let result: TriggerProgress[] = [];
      for (const step of progress?.children ?? []) {
        result = result.concat(stepsToDoForChallenge(step));
      }
      return result;
    } else {
      for (const step of progress?.children ?? []) {
        const stepsForCurrentStep = stepsToDoForChallenge(step);
        if (stepsForCurrentStep.length) {
          return stepsForCurrentStep;
        }
      }
      return [];
    }
  }

  if (progress && progress.progressPercentage !== 1) {
    return [progress];
  }
  return [];
}

// Priority for what quest(s) to show. The lower the number, the higher the priority.
export function getQuestShowingPriority(
  quest: QuestBundle,
  trackedQuestId: BiomesId
): number {
  const isTrackedQuest = quest.biscuit.id === trackedQuestId;
  if (isTrackedQuest) {
    return 0;
  }
  const isMainQuest = !quest.biscuit.isSideQuest;
  if (isMainQuest) {
    return 1;
  }
  return 2;
}

export async function shouldCloseDialog(
  resources: ClientResources,
  entityId: BiomesId,
  isValidStep: (newStepId: BiomesId, newQuestId: BiomesId) => boolean
): Promise<
  { closeDialog: true } | { closeDialog: false; newStep: QuestStepBundle }
> {
  let foundNewStep = false;
  let newStep: QuestStepBundle | undefined;
  for (let i = 0; i < 10; i++) {
    const nextChallenges = getAvailableOrInProgressChallenges(resources);
    const nextSteps = getRelevantStepsForEntity(
      resources,
      nextChallenges,
      entityId
    );
    const nextStepBundle = nextSteps.find((step) =>
      isValidStep(step.step.id, step.questBundle.biscuit.id)
    );
    if (nextStepBundle) {
      foundNewStep = true;
      newStep = nextStepBundle;
      break;
    }
    await sleep(50);
  }

  if (foundNewStep) {
    return { closeDialog: false, newStep: newStep! };
  }

  return { closeDialog: true };
}

export async function progressQuestAtEntity(
  stepBundle: QuestStepBundle,
  npcId: BiomesId,
  userId: BiomesId,
  resources: ClientResources,
  events: Events,
  chosenRewardIndex?: number
) {
  if (stepBundle.stepCompleted) {
    return { kind: "finished" };
  }
  if (stepBundle.isFirstStep) {
    await events.publish(
      new AcceptChallengeEvent({
        id: userId,
        challenge_id: stepBundle.questBundle.biscuit.id,
        npc_id: npcId,
      })
    );
  }

  await events.publish(
    new CompleteQuestStepAtEntityEvent({
      id: userId,
      challenge_id: stepBundle.questBundle.biscuit.id,
      entity_id: npcId,
      chosen_reward_index: chosenRewardIndex,
      step_id: stepBundle.step.id,
    })
  );

  const closeDialogInfo = await shouldCloseDialog(
    resources,
    npcId,
    (newStepId, newQuestId) =>
      newStepId !== stepBundle.step.id &&
      newQuestId === stepBundle.questBundle.biscuit.id
  );
  if (closeDialogInfo.closeDialog) {
    return { kind: "finished" };
  }
  return { kind: "newStep", newStep: closeDialogInfo.newStep };
}

export function findHighlights(letters: string[]): [string[], number[]] {
  const newLetters = [];
  const highlitLetterIndices: number[] = [];
  let highlighting = false;
  let asteriskSetsRemoved = 0;

  for (let i = 0; i < letters.length; i++) {
    if (letters[i] == "*" && letters[i + 1] == "*") {
      if (!highlighting) {
        highlighting = true;
        asteriskSetsRemoved++;
        i++;
      } else {
        highlighting = false;
        asteriskSetsRemoved++;
        i++;
      }
    } else {
      newLetters.push(letters[i]);
      if (highlighting) {
        highlitLetterIndices.push(i - asteriskSetsRemoved * 2);
      }
    }
  }
  return [newLetters, highlitLetterIndices];
}

export async function maybeTranslateDialogText(
  resources: ClientResources | ClientReactResources,
  dialogText: string,
  language: string
) {
  const chatTranslation = resources.get("/tweaks").chatTranslation;
  const original = removeTagsInDescription(dialogText);
  const originalSpokenText = spokenDialogInDescription(dialogText);

  if (!chatTranslation || language.split("-")[0] === "en") {
    return {
      shownText: original,
      spokenText: originalSpokenText,
    };
  }

  try {
    const res = await jsonPost<TranslateResponse, TranslateRequest>(
      "/api/voices/translate",
      {
        original: original,
        language,
      },
      { timeoutMs: 5000 }
    );
    const translated = res.translated ?? original;
    return {
      shownText: translated,
      spokenText:
        originalSpokenText.length > 0
          ? spokenDialogInDescription(translated)
          : "",
    };
  } catch {
    return {
      shownText: original,
      spokenText: originalSpokenText,
    };
  }
}
