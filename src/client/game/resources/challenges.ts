import { getTriggerIconUrl } from "@/client/components/inventory/icons";
import type { ClientContext } from "@/client/game/context";
import type { ClientTable } from "@/client/game/game";
import type {
  ClientResourceDeps,
  ClientResources,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { replaceDialogKeys } from "@/client/util/text_helpers";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { TriggerStateMap, TriggerTrees } from "@/shared/ecs/gen/types";
import { inventoryCount } from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import { bagSpecToItemBag } from "@/shared/game/items_serde";
import type { RawItem } from "@/shared/game/raw_item";
import type { ItemBag, NavigationAid } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { ReadonlyVec2, ReadonlyVec3 } from "@/shared/math/types";
import pluralize from "@/shared/plural";
import type { RegistryLoader } from "@/shared/registry";
import type { MetaState } from "@/shared/triggers/base_schema";
import { visitTrigger } from "@/shared/triggers/challenge";
import {
  zRewardsList,
  type StoredTriggerDefinition,
} from "@/shared/triggers/schema";
import { deserializeTriggerState } from "@/shared/triggers/state";
import { assertNever } from "@/shared/util/type_helpers";
import { capitalize, compact, isEqual, uniq } from "lodash";
import { z } from "zod";

export type TriggerProgressClaimRewardsPayload = {
  kind: "challengeClaimRewards";
  returnQuestGiverId?: BiomesId;
  allowDefaultNavigationAid: boolean;
  acceptText?: string;
  declineText?: string;
  rewardsList?: ItemBag[];
  itemsToTake?: ItemBag;
};

export type TriggerProgressCompleteQuestStepAtRobotPayload = {
  kind: "completeQuestStepAtMyRobot";
  allowDefaultNavigationAid: boolean;
  acceptText?: string;
  declineText?: string;
  rewardsList?: ItemBag[];
  itemsToTake?: ItemBag;
  transmissionText?: string;
};

export type TriggerMapBeamPayload = {
  kind: "mapBeam";
  location: ReadonlyVec2;
  allowDefaultNavigationAid: boolean;
};

export type TriggerApproachPositionPayload = {
  kind: "approachPosition";
  location: ReadonlyVec3;
  allowDefaultNavigationAid: boolean;
};

export type TriggerProgressKindPayload =
  | {
      kind: Exclude<
        StoredTriggerDefinition["kind"],
        | "mapBeam"
        | "challengeClaimRewards"
        | "completeQuestStepAtMyRobot"
        | "approachPosition"
      >;
    }
  | TriggerProgressClaimRewardsPayload
  | TriggerProgressCompleteQuestStepAtRobotPayload
  | TriggerMapBeamPayload
  | TriggerApproachPositionPayload;

export interface TriggerProgress<
  PT extends TriggerProgressKindPayload = TriggerProgressKindPayload
> {
  // Note: this will be used as a client bundle; don't store all internal
  // trigger metadata (StoredTriggerDefinition) on this class
  payload: PT;
  id: BiomesId;
  name?: string;
  icon?: string;
  navigationAid?: NavigationAid;
  description?: string;
  progressString: string;
  progressPercentage: number;
  rewards?: ItemBag;
  children?: TriggerProgress[];
}

function replaceKeys(
  table: ClientTable | undefined,
  userId: BiomesId | undefined,
  str: string,
  values?: {
    count?: string;
    countTarget?: string;
    action?: string;
    item?: string;
    type?: string;
    event?: string;
    eventDescription?: string;
    cameraMode?: string;
    people?: string;
    challenge?: string;
    npcName?: string;
    shape?: string;
    robotName?: string;
    block?: string;
    verb?: string;
    tool?: string;
    npc?: string;
    blueprint?: string;
    child?: { index: number; value: string }[];
  }
): string {
  if (!values) {
    return str;
  }

  let result = str;

  for (const [key, value] of Object.entries(values)) {
    if (value && typeof value === "string") {
      result = result.replaceAll(`{${key}}`, value);
    }
  }

  if (values.child) {
    for (const { index, value } of values.child) {
      result = result.replaceAll(`{child${index}}`, value);
    }
  }

  result = replaceDialogKeys(table, userId, result);

  return result;
}

function triggerDefDefaults(triggerDef: StoredTriggerDefinition) {
  return <TriggerProgress>{
    navigationAid: triggerDef.navigationAid,
    icon: triggerDef.icon && getTriggerIconUrl(triggerDef.icon),
    id: triggerDef.id,
    name: triggerDef.name,
    payload: {
      kind: triggerDef.kind,
    },
  };
}

function computeTriggerProgressCollect(
  table: ClientTable | undefined,
  userId: BiomesId | undefined,
  state: MetaState<any> | undefined,
  triggerDef: StoredTriggerDefinition & {
    count: number;
    item: RawItem;
  },
  verbOverride?: string
): TriggerProgress {
  const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
  return {
    ...triggerDefDefaults(triggerDef),
    description: replaceKeys(table, userId, triggerDef.description ?? "", {
      action: capitalize(triggerDef.kind),
      item: pluralize(anItem(triggerDef.item).displayName, triggerDef.count),
      count: count.toString(),
      countTarget: triggerDef.count.toString(),
    }),
    progressString: replaceKeys(
      table,
      userId,
      triggerDef.name ||
        `${
          verbOverride ? verbOverride : "{action}"
        } {count}/{countTarget} {item}`,
      {
        action: capitalize(triggerDef.kind),
        item: pluralize(anItem(triggerDef.item).displayName, triggerDef.count),
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      }
    ),
    progressPercentage: triggerDef.count === 0 ? 1 : count / triggerDef.count,
  };
}

function computeTriggerProgressCollectType(
  table: ClientTable | undefined,
  userId: BiomesId | undefined,
  state: MetaState<any> | undefined,
  triggerDef: StoredTriggerDefinition & {
    count: number;
    typeId: BiomesId;
  },
  verbOverride?: string
): TriggerProgress {
  const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
  return {
    ...triggerDefDefaults(triggerDef),
    progressPercentage: state?.firedAt
      ? 1
      : count / Math.max(triggerDef.count ?? 0, 1),
    progressString: replaceKeys(
      table,
      userId,
      triggerDef.name ||
        `${
          verbOverride ? verbOverride : "{action}"
        } {count}/{countTarget} {type}`,
      {
        action: capitalize(triggerDef.kind),
        type: pluralize(
          anItem(triggerDef.typeId).displayName,
          triggerDef.count
        ),
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      }
    ),
  };
}

export function computeTriggerProgress(
  userId: BiomesId | undefined,
  table: ClientTable | undefined,
  deps: ClientResourceDeps | undefined,
  triggerDef: StoredTriggerDefinition,
  stateProvider: (id: BiomesId) => MetaState | undefined
): TriggerProgress {
  const state = stateProvider(triggerDef.id);
  switch (triggerDef.kind) {
    case "all": {
      const children = triggerDef.triggers.map((child) =>
        computeTriggerProgress(userId, table, deps, child, stateProvider)
      );
      const completedChildren = state?.firedAt
        ? children.length
        : children.reduce(
            (acc, child) => acc + child?.progressPercentage ?? 0,
            0
          );

      const count = state?.firedAt
        ? children.length
        : state?.payload ?? completedChildren;
      return {
        ...triggerDefDefaults(triggerDef),
        description: triggerDef.description || "Complete all of the following",
        progressString: replaceKeys(table, userId, triggerDef.name ?? "", {
          count: count.toString(),
          countTarget: children.length.toString(),
          child: children.map((c, i) => ({
            index: i,
            value: c.progressString,
          })),
        }),
        progressPercentage:
          state?.firedAt || children.length === 0
            ? 1
            : completedChildren / children.length,
        children,
      };
    }
    case "any": {
      const children = triggerDef.triggers.map((child) =>
        computeTriggerProgress(userId, table, deps, child, stateProvider)
      );
      const count = state?.firedAt ? 1 : 0;
      return {
        ...triggerDefDefaults(triggerDef),
        description: triggerDef.description || "Complete any of the following",
        progressString: replaceKeys(table, userId, triggerDef.name ?? "", {
          count: count.toString(),
          countTarget: children.length.toString(),
          child: children.map((c, i) => ({
            index: i,
            value: c.progressString,
          })),
        }),
        progressPercentage: state?.firedAt
          ? 1
          : children.reduce(
              (acc, child) => Math.max(acc, child?.progressPercentage ?? 0),
              0
            ),
        children,
      };
    }
    case "seq": {
      const children = triggerDef.triggers.map((child) =>
        computeTriggerProgress(userId, table, deps, child, stateProvider)
      );
      const firstIncompleteChild = children.findIndex(
        (child) => child.progressPercentage < 1
      );
      const count = state?.firedAt
        ? children.length
        : state?.payload ?? firstIncompleteChild;
      return {
        ...triggerDefDefaults(triggerDef),
        description: triggerDef.description || "Complete the following steps",
        progressString: replaceKeys(table, userId, triggerDef.name ?? "", {
          count: count.toString(),
          countTarget: children.length.toString(),
          child: children.map((c, i) => ({
            index: i,
            value: c.progressString,
          })),
        }),
        progressPercentage:
          state?.firedAt || children.length === 0 || firstIncompleteChild === -1
            ? 1
            : firstIncompleteChild / children.length,
        children,
      };
    }
    case "variant": {
      const stepId = state?.payload ?? INVALID_BIOMES_ID;
      const child = triggerDef.triggers.find((child) => child.id === stepId);
      if (!child) {
        return {
          ...triggerDefDefaults(triggerDef),
          description: "...",
        };
      }
      return computeTriggerProgress(userId, table, deps, child, stateProvider);
    }
    case "collect":
      return computeTriggerProgressCollect(
        table,
        userId,
        state,
        triggerDef,
        "Collect"
      );
    case "everCollect":
      return computeTriggerProgressCollect(
        table,
        userId,
        state,
        triggerDef,
        "Have ever collected"
      );
    case "everCraft": {
      return computeTriggerProgressCollect(
        table,
        userId,
        state,
        triggerDef,
        "Have ever crafted"
      );
    }
    case "craft": {
      const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
      const handCraft = !triggerDef.station;
      let progressString =
        triggerDef.count > 1
          ? `${handCraft ? "Handcraft" : "Craft"} ${
              state?.firedAt ? triggerDef.count : count
            }/${triggerDef.count ?? 0} ${pluralize(
              anItem(triggerDef.item).displayName
            )}`
          : `${handCraft ? "Handcraft" : "Craft"} a ${
              anItem(triggerDef.item).displayName
            }`;
      if (triggerDef.station && !handCraft) {
        progressString += ` at ${anItem(triggerDef.station).displayName}`;
      }
      const keysToReplace = {
        item: pluralize(anItem(triggerDef.item).displayName, triggerDef.count),
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name ?? progressString,
          keysToReplace
        ),
        progressPercentage: state?.firedAt
          ? 1
          : count / Math.max(triggerDef.count ?? 0, 1),
      };
    }
    case "wear": {
      const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
      const stringStarter =
        triggerDef.count > 1 ? `${count}/${triggerDef.count ?? 0}` : "Wear a";
      const keysToReplace = {
        item: pluralize(anItem(triggerDef.item).displayName, triggerDef.count),
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt
          ? 1
          : count / Math.max(triggerDef.count ?? 0, 1),
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name ||
            `${stringStarter} {item} ${triggerDef.count > 1 ? "worn" : ""}`,
          keysToReplace
        ),
      };
    }
    case "wearType": {
      const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
      const stringStarter =
        triggerDef.count > 1 ? `${count}/${triggerDef.count ?? 0}` : "Wear a";
      const keysToReplace = {
        type: pluralize(
          anItem(triggerDef.typeId).displayName,
          triggerDef.count
        ),
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt
          ? 1
          : count / Math.max(triggerDef.count ?? 0, 1),
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name ||
            `${stringStarter} {type} ${triggerDef.count > 1 ? "worn" : ""}`,
          keysToReplace
        ),
      };
    }
    case "craftType": {
      const handCraft = !triggerDef.station;
      return computeTriggerProgressCollectType(
        table,
        userId,
        state,
        triggerDef,
        handCraft ? "Handcraft" : "Craft"
      );
    }
    case "event": {
      const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
      const keysToReplace = {
        event: triggerDef.eventKind,
        eventDescription: triggerDef.eventKind,
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };

      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt
          ? 1
          : count / Math.max(triggerDef.count ?? 0, 1),
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name || "{eventDescription} ({count}/{countTarget})",
          keysToReplace
        ),
      };
    }
    case "cameraPhoto": {
      const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
      const photoType =
        triggerDef.mode === "selfie"
          ? "selfie"
          : triggerDef.mode === "fps"
          ? "first-person photo"
          : triggerDef.mode === "normal"
          ? "third-person photo"
          : "photo";
      const starterString =
        triggerDef.count > 1
          ? `${count}/${triggerDef.count} ${pluralize(photoType)} taken`
          : `Take a ${photoType}`;

      const peopleString = triggerDef.people
        ? `with ${triggerDef.people} other ${pluralize(
            "person",
            triggerDef.people
          )}`
        : undefined;

      const keysToReplace = {
        cameraMode: triggerDef.mode?.toString() || "Camera",
        people: triggerDef.people?.toString() || "0",
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt
          ? 1
          : count / Math.max(triggerDef.count ?? 0, 1),
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString:
          replaceKeys(table, userId, triggerDef.name ?? "", keysToReplace) ||
          `${starterString ?? ""} ${peopleString ?? ""}`,
      };
    }
    case "completeQuestStepAtMyRobot":
    case "challengeClaimRewards": {
      const npcName =
        triggerDef.kind === "challengeClaimRewards"
          ? deps?.get("/ecs/c/label", triggerDef.returnNpcTypeId)?.text ?? "..."
          : "your Robot";
      const progressString = (() => {
        if (triggerDef.name) {
          return triggerDef.name;
        }
        return `Talk to ${npcName}`;
      })();

      const keysToReplace = {
        npcName: npcName,
      };

      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt ? 1 : 0,
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          progressString ?? "Unknown",
          keysToReplace
        ),
        payload: {
          kind: triggerDef.kind,
          returnQuestGiverId:
            triggerDef.kind === "challengeClaimRewards"
              ? triggerDef.returnNpcTypeId
              : undefined,
          transmissionText:
            triggerDef.kind === "completeQuestStepAtMyRobot"
              ? triggerDef.transmissionText
              : undefined,
          allowDefaultNavigationAid: triggerDef.allowDefaultNavigationAid,
          acceptText: replaceKeys(
            table,
            userId,
            triggerDef.acceptText ?? "",
            keysToReplace
          ),
          declineText: triggerDef.declineText,
          rewardsList:
            triggerDef.rewardsList &&
            zRewardsList.parse(triggerDef.rewardsList),
          itemsToTake: triggerDef.itemsToTake
            ? bagSpecToItemBag(triggerDef.itemsToTake)
            : undefined,
        },
      };
    }
    case "challengeComplete": {
      const keysToReplace = {
        challenge:
          deps?.get("/ecs/c/label", triggerDef.challenge)?.text ?? "...",
      };
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt ? 1 : 0,
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name || "Challenge {challenge}",
          keysToReplace
        ),
      };
    }
    case "challengeUnlocked": {
      const keysToReplace = {
        challenge: triggerDef.challenge?.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt ? 1 : 0,
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name || "Unlock Challenge {challenge}",
          keysToReplace
        ),
      };
    }
    case "place": {
      const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
      const keysToReplace = {
        block: anItem(triggerDef.item).displayName,
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt ? 1 : count / triggerDef.count,
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString:
          replaceKeys(table, userId, triggerDef.name ?? "", keysToReplace) ||
          `${state?.firedAt ? triggerDef.count : count}/${
            triggerDef.count
          } ${pluralize(
            `${anItem(triggerDef.item).displayName} Block`,
            triggerDef.count
          )}`,
      };
    }
    case "blueprintBuilt": {
      const count = state?.firedAt ? triggerDef.count : state?.payload ?? 0;
      const starterString =
        triggerDef.count > 1 ? `${count}/${triggerDef.count}` : "";

      const keysToReplace = {
        blueprint: anItem(triggerDef.blueprint).displayName,
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };

      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt ? 1 : count / triggerDef.count,
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString:
          replaceKeys(table, userId, triggerDef.name ?? "", keysToReplace) ||
          `${starterString} Build a ${anItem(
            triggerDef.blueprint
          ).displayName.replace(/Blueprint/, "")} using its blueprint`,
      };
    }
    case "collectType": {
      return computeTriggerProgressCollectType(
        table,
        userId,
        state,
        triggerDef,
        "Collect"
      );
    }
    case "everCollectType": {
      return computeTriggerProgressCollectType(
        table,
        userId,
        state,
        triggerDef,
        "Have ever collected"
      );
    }
    case "everCraftType": {
      return computeTriggerProgressCollectType(
        table,
        userId,
        state,
        triggerDef,
        "Have ever crafted"
      );
    }
    case "mapBeam": {
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt ? 1 : 0,
        progressString:
          triggerDef.name ||
          `Approach Beam at (${triggerDef.pos[0]}, ${triggerDef.pos[1]})`,
        payload: {
          kind: triggerDef.kind,
          location: triggerDef.pos,
          allowDefaultNavigationAid: triggerDef.allowDefaultNavigationAid,
        },
      };
    }
    case "approachPosition": {
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt ? 1 : 0,
        progressString:
          triggerDef.name ||
          `Approach (${triggerDef.pos[0]}, ${triggerDef.pos[1]}, ${triggerDef.pos[2]})`,
        payload: {
          kind: triggerDef.kind,
          location: triggerDef.pos,
          allowDefaultNavigationAid: triggerDef.allowDefaultNavigationAid,
        },
      };
    }
    case "inventoryHas": {
      const inventory = userId && deps?.get("/ecs/c/inventory", userId);
      let count = 0;
      if (state?.firedAt) {
        count = triggerDef.count;
      } else if (inventory) {
        count = Number(inventoryCount(inventory, anItem(triggerDef.item)));
      }
      const keysToReplace = {
        action: capitalize(triggerDef.kind),
        item: pluralize(anItem(triggerDef.item).displayName, triggerDef.count),
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        description: replaceKeys(
          table,
          userId,
          triggerDef.description ?? "",
          keysToReplace
        ),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name || "Own {count}/{countTarget} {item}",
          keysToReplace
        ),
        progressPercentage:
          triggerDef.count === 0 ? 1 : count / triggerDef.count,
      };
    }
    case "inventoryHasType": {
      const inventory = userId && deps?.get("/ecs/c/inventory", userId);
      let count = 0;
      if (state?.firedAt) {
        count = triggerDef.count;
      } else if (inventory) {
        count = Number(
          inventoryCount(inventory, anItem(triggerDef.typeId), {
            allowTypeMatch: true,
          })
        );
      }

      const keysToReplace = {
        type: pluralize(
          anItem(triggerDef.typeId).displayName,
          triggerDef.count
        ),
        count: count.toString(),
        countTarget: triggerDef.count.toString(),
      };
      return {
        ...triggerDefDefaults(triggerDef),
        progressPercentage: state?.firedAt
          ? 1
          : count / Math.max(triggerDef.count ?? 0, 1),
        progressString: replaceKeys(
          table,
          userId,
          triggerDef.name || "Own {count}/{countTarget} {type}",
          keysToReplace
        ),
      };
    }
  }
  assertNever(triggerDef);
}

export interface QuestBundle {
  challengeDeps: BiomesId[];
  biscuit: Biscuit;
  progress?: TriggerProgress;
  state: "completed" | "in_progress" | "available" | "locked";
}

function genQuestBundle(
  { userId, table }: { userId: BiomesId; table: ClientTable },
  deps: ClientResourceDeps,
  challengeId: BiomesId
): QuestBundle | undefined {
  const quest = anItem(challengeId);
  if (!quest?.isQuest) {
    return;
  }

  const state = deps.get("/challenges/state", challengeId);
  const progress = quest.trigger
    ? computeTriggerProgress(userId, table, deps, quest.trigger, (stepId) => {
        const ret = deps.get(
          "/challenges/trigger_state/step",
          challengeId,
          stepId
        );
        return ret;
      })
    : undefined;

  const challengeDeps: Array<BiomesId> = [];
  if (quest.unlock) {
    visitTrigger(quest.unlock, (e) => {
      if (e.kind === "challengeComplete") {
        challengeDeps.push(e.challenge);
      }
    });
  }

  return {
    challengeDeps,
    biscuit: quest,
    state: state,
    progress,
  };
}

function fetchAvailableOrInProgressChallenges(
  { userId }: { userId: BiomesId },
  deps: ClientResourceDeps
) {
  const challenges = deps.get("/ecs/c/challenges", userId);
  if (!challenges) {
    return [];
  }
  return compact(
    uniq([...challenges.in_progress, ...challenges.available]).map((id) =>
      deps.get("/quest", id)
    )
  );
}

function getActiveLeafSteps(
  progress: TriggerProgress<TriggerProgressKindPayload>
): Array<TriggerProgress<TriggerProgressKindPayload>> {
  if (progress.progressPercentage > 1.0) {
    return [];
  }

  const ret: Array<TriggerProgress<TriggerProgressKindPayload>> = [];

  switch (progress.payload.kind) {
    case "all":
    case "any":
      for (const child of progress.children ?? []) {
        if (child.progressPercentage < 1.0) {
          ret.push(...getActiveLeafSteps(child));
        }
      }
      return ret;
      break;

    case "seq":
      for (const child of progress.children!) {
        if (child.progressPercentage < 1.0) {
          ret.push(...getActiveLeafSteps(child));
          break;
        }
      }
      return ret;

    default:
      if (progress.progressPercentage < 1.0) {
        return [progress];
      }

      return [];
  }
}

async function genActiveLeaves(
  { userId }: { userId: BiomesId },
  deps: ClientResourceDeps
) {
  const challenges = deps.get("/ecs/c/challenges", userId);
  const inProgress = compact(
    await Promise.all(
      [...(challenges?.in_progress ?? new Set())].map((e) =>
        deps.get("/quest", e)
      )
    )
  );

  const ret: Array<TriggerProgress<TriggerProgressKindPayload>> = [];

  for (const challengeBundle of inProgress) {
    if (challengeBundle.progress) {
      ret.push(...getActiveLeafSteps(challengeBundle.progress));
    }
  }

  return ret;
}

export interface ChallengeStateIndex {
  questIdToState: Map<BiomesId, QuestBundle["state"]>;
}

export function genChallengesStateIndex(): ChallengeStateIndex {
  return {
    questIdToState: new Map(),
  };
}

export function updateChallengeStateIndex(
  { userId, resources }: { userId: BiomesId; resources: ClientResources },
  deps: ClientResourceDeps,
  index: ChallengeStateIndex
) {
  const covered = new Set<BiomesId>();

  const challenges = deps.get("/ecs/c/challenges", userId);
  for (const available of challenges?.available ?? []) {
    covered.add(available);
    if (index.questIdToState.get(available) !== "available") {
      index.questIdToState.set(available, "available");
      resources.invalidate("/challenges/state", available);
    }
  }

  for (const completed of challenges?.complete ?? []) {
    covered.add(completed);
    if (index.questIdToState.get(completed) !== "completed") {
      index.questIdToState.set(completed, "completed");
      resources.invalidate("/challenges/state", completed);
    }
  }

  for (const inProgress of challenges?.in_progress ?? []) {
    covered.add(inProgress);
    if (index.questIdToState.get(inProgress) !== "in_progress") {
      index.questIdToState.set(inProgress, "in_progress");
      resources.invalidate("/challenges/state", inProgress);
    }
  }

  for (const id of index.questIdToState.keys()) {
    if (!covered.has(id)) {
      index.questIdToState.delete(id);
      resources.invalidate("/challenges/state", id);
    }
  }
}

export function genChallengeState(
  { resources }: { resources: ClientResources },
  _deps: ClientResourceDeps,
  challengeId: BiomesId
) {
  return (
    resources
      .get("/challenges/state_dispatch")
      .questIdToState.get(challengeId) ?? "locked"
  );
}

export interface TriggerStateIndex {
  triggerStates: TriggerTrees;
}

export function genTriggerStateIndex(): TriggerStateIndex {
  return {
    triggerStates: new Map(),
  };
}

export function updateTriggerStateIndex(
  { userId, resources }: { userId: BiomesId; resources: ClientResources },
  deps: ClientResourceDeps,
  index: TriggerStateIndex
) {
  const ecs = deps.get("/ecs/c/trigger_state", userId);
  for (const [id, state] of ecs?.by_root ?? new Map()) {
    if (!isEqual(index.triggerStates.get(id), state)) {
      index.triggerStates.set(id, state);
      resources.invalidate("/challenges/trigger_state", id);
    }
  }

  for (const id of index.triggerStates.keys()) {
    if (!ecs?.by_root.has(id)) {
      index.triggerStates.delete(id);
      resources.invalidate("/challenges/trigger_state", id);
    }
  }
}

export function genTriggerState(
  { userId, resources }: { userId: BiomesId; resources: ClientResources },
  _deps: ClientResourceDeps,
  questId: BiomesId
) {
  return resources.get("/ecs/c/trigger_state", userId)?.by_root.get(questId);
}

export interface TriggerStateStepIndex {
  stepStates: TriggerStateMap;
}

export function genTriggerStateStepIndex(
  {},
  _deps: ClientResourceDeps,
  _questId: BiomesId
): TriggerStateStepIndex {
  return {
    stepStates: new Map(),
  };
}

export function updateTriggerStateStepIndex(
  { resources }: { resources: ClientResources },
  deps: ClientResourceDeps,
  index: TriggerStateStepIndex,
  questId: BiomesId
) {
  const steps = deps.get("/challenges/trigger_state", questId);
  if (steps) {
    for (const [id, state] of steps) {
      if (!isEqual(index.stepStates.get(id), state)) {
        index.stepStates.set(id, state);
        resources.invalidate("/challenges/trigger_state/step", questId, id);
      }
    }
  }

  for (const id of index.stepStates.keys()) {
    if (!steps?.has(id)) {
      index.stepStates.delete(id);
      resources.invalidate("/challenges/trigger_state/step", questId, id);
    }
  }
}

export function genTriggerStateStep(
  { resources }: { userId: BiomesId; resources: ClientResources },
  _deps: ClientResourceDeps,
  questId: BiomesId,
  id: BiomesId
) {
  const triggerStates = resources.get("/challenges/trigger_state", questId);
  const rawState = triggerStates?.get(id);
  if (!rawState) {
    return;
  }
  return deserializeTriggerState(rawState, z.any());
}

export interface TriggerStateStepIndex {
  stepStates: TriggerStateMap;
}

export async function addChallengeResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add(
    "/challenges/available_or_in_progress",
    loader.provide(fetchAvailableOrInProgressChallenges)
  );
  builder.add("/challenges/active_leaves", loader.provide(genActiveLeaves));

  // The following rigamorole is to ensure that we can get fine-grained invalidation
  // from objects that only invalidate in batch (e.g. the challenge state, trigger step states).
  builder.addDynamic(
    "/challenges/state_dispatch",
    loader.provide(genChallengesStateIndex),
    loader.provide(updateChallengeStateIndex)
  );
  builder.addDynamic(
    "/challenges/trigger_state_dispatch",
    loader.provide(genTriggerStateIndex),
    loader.provide(updateTriggerStateIndex)
  );
  builder.add("/challenges/trigger_state", loader.provide(genTriggerState));
  builder.addDynamic(
    "/challenges/trigger_state/step_dispatch",
    loader.provide(genTriggerStateStepIndex),
    loader.provide(updateTriggerStateStepIndex)
  );
  builder.add(
    "/challenges/trigger_state/step",
    loader.provide(genTriggerStateStep)
  );
  builder.add("/challenges/state", loader.provide(genChallengeState));
  builder.add("/quest", loader.provide(genQuestBundle));
}
