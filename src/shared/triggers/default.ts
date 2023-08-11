import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { ok } from "assert";

export const triggerPartials = () =>
  (<[string, StoredTriggerDefinition][]>[
    [
      "All of",
      {
        kind: "all",
        triggers: [],
      },
    ],
    [
      "Any of",
      {
        kind: "any",
        triggers: [],
      },
    ],
    [
      "Ordered",
      {
        kind: "seq",
        triggers: [],
      },
    ],
    [
      "Variant",
      {
        kind: "variant",
        triggers: [],
        rollType: "daily",
      },
    ],
    [
      "Blueprint Built",
      {
        kind: "blueprintBuilt",
        blueprint: 0,
        count: 1,
      },
    ],
    [
      "Talk to NPC",
      {
        kind: "challengeClaimRewards",
        challenge: INVALID_BIOMES_ID,
      },
    ],
    [
      "Talk to Robot",
      {
        kind: "completeQuestStepAtMyRobot",
        challenge: INVALID_BIOMES_ID,
      },
    ],
    [
      "Challenge Complete",
      {
        kind: "challengeComplete",
        challenge: INVALID_BIOMES_ID,
      },
    ],
    [
      "Challenge Unlocked",
      {
        kind: "challengeUnlocked",
        challenge: INVALID_BIOMES_ID,
      },
    ],
    [
      "Map Beam",
      {
        kind: "mapBeam",
        pos: [0, 0],
      },
    ],
    [
      "Approach Position",
      {
        kind: "approachPosition",
        pos: [0, 0, 0],
      },
    ],
    [
      "Collect",
      {
        kind: "collect",
        item: anItem(BikkieIds.grass),
        count: 1,
      },
    ],
    [
      "Collect Type",
      {
        kind: "collectType",
        typeId: BikkieIds.grass,
        count: 1,
      },
    ],
    [
      "Ever Collected",
      {
        kind: "everCollect",
        item: anItem(BikkieIds.grass),
        count: 1,
      },
    ],
    [
      "Ever Collected Type",
      {
        kind: "everCollectType",
        typeId: BikkieIds.grass,
        count: 1,
      },
    ],
    [
      "Ever Crafted",
      {
        kind: "everCraft",
        item: anItem(BikkieIds.grassyBottom),
        count: 1,
      },
    ],
    [
      "Ever Crafted Type",
      {
        kind: "everCraftType",
        typeId: BikkieIds.bottoms,
        count: 1,
      },
    ],
    [
      "Craft",
      {
        kind: "craft",
        item: anItem(BikkieIds.grass),
        count: 1,
      },
    ],
    [
      "Craft Type",
      {
        kind: "craftType",
        typeId: BikkieIds.grass,
        count: 1,
      },
    ],
    [
      "* Event",
      {
        kind: "event",
        eventKind: "like",
        count: 1,
      },
    ],
    [
      "Place",
      {
        kind: "place",
        item: anItem(BikkieIds.grass),
        count: 1,
      },
    ],
    [
      "Skill Level",
      {
        kind: "skillLevel",
        skill: "artistry",
        level: 1,
      },
    ],
    [
      "Take Photo",
      {
        kind: "cameraPhoto",
        count: 1,
      },
    ],
    [
      "Wear",
      {
        kind: "wear",
        item: anItem(BikkieIds.dirt),
        count: 1,
      },
    ],
    [
      "Wear Type",
      {
        kind: "wearType",
        typeId: BikkieIds.hat,
        count: 1,
      },
    ],
    [
      "Inventory Has",
      {
        kind: "inventoryHas",
        item: anItem(BikkieIds.grass),
        count: 1,
      },
    ],
    [
      "Inventory Has Type",
      {
        kind: "inventoryHasType",
        typeId: BikkieIds.grass,
        count: 1,
      },
    ],
  ]).sort(([a], [b]) => a.localeCompare(b));

export async function createDefaultTrigger(
  idGenerator: { next(): Promise<BiomesId> },
  kind: StoredTriggerDefinition["kind"]
) {
  const partialToAdd = triggerPartials().find(([, def]) => def.kind === kind);
  ok(partialToAdd, "Cannot create trigger of unknown kind");
  return {
    ...partialToAdd[1],
    id: await idGenerator.next(),
  };
}
