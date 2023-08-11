import {
  AllTrigger,
  AnyTrigger,
  SeqTrigger,
  VariantTrigger,
} from "@/server/shared/triggers/aggregate";
import type { Trigger } from "@/server/shared/triggers/core";
import { ApproachPositionTrigger } from "@/server/shared/triggers/leaves/approachPosition";
import { BlueprintBuiltTrigger } from "@/server/shared/triggers/leaves/blueprintBuilt";
import { CameraPhotoTrigger } from "@/server/shared/triggers/leaves/cameraPhoto";
import { ChallengeClaimRewardsTrigger } from "@/server/shared/triggers/leaves/challengeClaimRewards";
import { ChallengeCompleteTrigger } from "@/server/shared/triggers/leaves/challengeComplete";
import { ChallengeUnlockedTrigger } from "@/server/shared/triggers/leaves/challengeUnlock";
import {
  CollectTrigger,
  CollectTypeTrigger,
} from "@/server/shared/triggers/leaves/collect";
import { CompleteQuestStepAtMyRobotTrigger } from "@/server/shared/triggers/leaves/completeStepAtMyRobot";
import {
  CraftTrigger,
  CraftTypeTrigger,
} from "@/server/shared/triggers/leaves/craft";
import { EventTrigger } from "@/server/shared/triggers/leaves/event";
import {
  InventoryHasTrigger,
  InventoryHasTypeTrigger,
} from "@/server/shared/triggers/leaves/inventoryHas";
import {
  EverCollectTrigger,
  EverCollectTypeTrigger,
  EverCraftTrigger,
  EverCraftTypeTrigger,
} from "@/server/shared/triggers/leaves/lifetime";
import { MapBeamTrigger } from "@/server/shared/triggers/leaves/mapBeam";

import { PlaceTrigger } from "@/server/shared/triggers/leaves/place";

import {
  WearTrigger,
  WearTypeTrigger,
} from "@/server/shared/triggers/leaves/wear";
import { zStoredTriggerDefinition } from "@/shared/triggers/schema";
import { assertNever } from "@/shared/util/type_helpers";

export type TriggerDeserializer = (data: any) => Trigger;

export function deserializeTrigger(data: any): Trigger {
  const stored = zStoredTriggerDefinition.parse(data);
  switch (stored.kind) {
    case "all":
      return AllTrigger.deserialize(stored, deserializeTrigger);
    case "any":
      return AnyTrigger.deserialize(stored, deserializeTrigger);
    case "seq":
      return SeqTrigger.deserialize(stored, deserializeTrigger);
    case "variant":
      return VariantTrigger.deserialize(stored, deserializeTrigger);
    case "blueprintBuilt":
      return BlueprintBuiltTrigger.deserialize(stored);
    case "cameraPhoto":
      return CameraPhotoTrigger.deserialize(stored);
    case "challengeClaimRewards":
      return ChallengeClaimRewardsTrigger.deserialize(stored);
    case "completeQuestStepAtMyRobot":
      return CompleteQuestStepAtMyRobotTrigger.deserialize(stored);
    case "challengeComplete":
      return ChallengeCompleteTrigger.deserialize(stored);
    case "challengeUnlocked":
      return ChallengeUnlockedTrigger.deserialize(stored);
    case "collect":
      return CollectTrigger.deserialize(stored);
    case "collectType":
      return CollectTypeTrigger.deserialize(stored);
    case "craft":
      return CraftTrigger.deserialize(stored);
    case "craftType":
      return CraftTypeTrigger.deserialize(stored);
    case "everCollect":
      return EverCollectTrigger.deserialize(stored);
    case "everCollectType":
      return EverCollectTypeTrigger.deserialize(stored);
    case "everCraft":
      return EverCraftTrigger.deserialize(stored);
    case "everCraftType":
      return EverCraftTypeTrigger.deserialize(stored);
    case "event":
      return EventTrigger.deserialize(stored);
    case "inventoryHas":
      return InventoryHasTrigger.deserialize(stored);
    case "inventoryHasType":
      return InventoryHasTypeTrigger.deserialize(stored);
    case "place":
      return PlaceTrigger.deserialize(stored);
    case "wear":
      return WearTrigger.deserialize(stored);
    case "wearType":
      return WearTypeTrigger.deserialize(stored);
    case "mapBeam":
      return MapBeamTrigger.deserialize(stored);
    case "approachPosition":
      return ApproachPositionTrigger.deserialize(stored);
  }
  assertNever(stored);
}
