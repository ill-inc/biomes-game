import type { FirehoseEvent } from "@/shared/firehose/events";
import { zBagSpec } from "@/shared/game/bag_spec";
import { zItem as zItemImport } from "@/shared/game/item";
import { bagSpecToItemBag } from "@/shared/game/items_serde";
import type { ItemBag } from "@/shared/game/types";
import { zCameraMode } from "@/shared/game/types";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import { zVec2f, zVec3f } from "@/shared/math/types";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import { zBaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import { zMatcher } from "@/shared/triggers/matcher_schema";
import { isArray, memoize } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

// Need this indirect as items can contain trigger properties.
const zItem = z.lazy(memoize(() => zItemImport));

export const zBlueprintBuiltStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("blueprintBuilt"),
    blueprint: zBiomesId,
    count: z.number(),
  });

export type BlueprintBuiltStoredTriggerDefinition = z.infer<
  typeof zBlueprintBuiltStoredTriggerDefinition
>;

export const zCameraPhotoStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("cameraPhoto"),
    count: z.number(),
    mode: zCameraMode.optional(),
    people: z.number().optional(),
    groups: z.number().optional(),
    groupId: zBiomesId.optional(),
  });

export type CameraPhotoStoredTriggerDefinition = z.infer<
  typeof zCameraPhotoStoredTriggerDefinition
>;

export const zRewardsList = z
  .union([
    zBagSpec,
    z.map(
      z.string(),
      z.object({
        item: zItem,
        count: z.bigint(),
      })
    ),
  ])
  .transform((v) => (isArray(v) ? bagSpecToItemBag(v) : v) as ItemBag)
  .array();

const zTalkToBaseTriggerDefinition = z.object({
  allowDefaultNavigationAid: z.boolean().default(true),
  acceptText: z.string().default("").optional(),
  declineText: z.string().default("").optional(),
  rewardsList: zRewardsList.optional(),
  itemsToTake: zBagSpec.optional(),
});

export const zChallengeClaimRewardsTriggerDefinition =
  zBaseStoredTriggerDefinition.merge(zTalkToBaseTriggerDefinition).extend({
    kind: z.literal("challengeClaimRewards"),
    returnNpcTypeId: zBiomesId.default(INVALID_BIOMES_ID),
  });

export type ChallengeClaimRewardsTriggerDefinition = z.infer<
  typeof zChallengeClaimRewardsTriggerDefinition
>;

export const zCompleteQuestStepAtMyRobotTriggerDefinition =
  zBaseStoredTriggerDefinition.merge(zTalkToBaseTriggerDefinition).extend({
    kind: z.literal("completeQuestStepAtMyRobot"),
    transmissionText: z.string().default("").optional(),
  });

export type CompleteQuestStepAtMyRobotTriggerDefinition = z.infer<
  typeof zCompleteQuestStepAtMyRobotTriggerDefinition
>;

export const zChallengeCompleteStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("challengeComplete"),
    challenge: zBiomesId,
  });

export type ChallengeCompleteStoredTriggerDefinition = z.infer<
  typeof zChallengeCompleteStoredTriggerDefinition
>;

export const zChallengeUnlockedStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("challengeUnlocked"),
    challenge: zBiomesId,
  });

export type ChallengeUnlockedStoredTriggerDefinition = z.infer<
  typeof zChallengeUnlockedStoredTriggerDefinition
>;

export const zCollectStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("collect"),
    item: zItem,
    count: z.number(),
  });

export type CollectStoredTriggerDefinition = z.infer<
  typeof zCollectStoredTriggerDefinition
>;

export const zCollectTypeStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("collectType"),
    typeId: zBiomesId,
    count: z.number(),
  });

export type CollectTypeStoredTriggerDefinition = z.infer<
  typeof zCollectTypeStoredTriggerDefinition
>;

export const zEverCollectStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("everCollect"),
    item: zItem,
    count: z.number(),
  });

export type EverCollectStoredTriggerDefinition = z.infer<
  typeof zEverCollectStoredTriggerDefinition
>;

export const zEverCollectTypeStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("everCollectType"),
    typeId: zBiomesId,
    count: z.number(),
  });

export type EverCollectTypeStoredTriggerDefinition = z.infer<
  typeof zEverCollectTypeStoredTriggerDefinition
>;

export const zEverCraftStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("everCraft"),
    item: zItem,
    count: z.number(),
  });

export type EverCraftStoredTriggerDefinition = z.infer<
  typeof zEverCraftStoredTriggerDefinition
>;

export const zEverCraftTypeStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("everCraftType"),
    typeId: zBiomesId,
    count: z.number(),
  });

export type EverCraftTypeStoredTriggerDefinition = z.infer<
  typeof zEverCraftTypeStoredTriggerDefinition
>;

export const zCraftStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("craft"),
    item: zItem,
    count: z.number(),
    station: zBiomesId.optional(),
  });

export type CraftStoredTriggerDefinition = z.infer<
  typeof zCraftStoredTriggerDefinition
>;

export const zCraftTypeStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("craftType"),
    typeId: zBiomesId,
    count: z.number(),
    station: zBiomesId.optional(),
  });

export type CraftTypeStoredTriggerDefinition = z.infer<
  typeof zCraftTypeStoredTriggerDefinition
>;

export const zEventStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("event"),
    eventKind: z.string() as unknown as z.ZodType<FirehoseEvent["kind"]>,
    count: z.number(),
    predicate: zMatcher.optional(),
  });

export type EventStoredTriggerDefinition = z.infer<
  typeof zEventStoredTriggerDefinition
>;

export const zInventoryHasStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("inventoryHas"),
    item: zItem,
    count: z.number(),
  });

export type InventoryHasStoredTriggerDefinition = z.infer<
  typeof zInventoryHasStoredTriggerDefinition
>;

export const zInventoryHasTypeStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("inventoryHasType"),
    typeId: zBiomesId,
    count: z.number(),
  });

export type InventoryHasTypeStoredTriggerDefinition = z.infer<
  typeof zInventoryHasTypeStoredTriggerDefinition
>;

export const zPlaceStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("place"),
    item: zItem,
    count: z.number(),
  });

export type PlaceStoredTriggerDefinition = z.infer<
  typeof zPlaceStoredTriggerDefinition
>;

export const zMapBeamStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("mapBeam"),
    pos: zVec2f,
    allowDefaultNavigationAid: z.boolean().default(true),
  });

export type MapBeamStoredTriggerDefinition = z.infer<
  typeof zMapBeamStoredTriggerDefinition
>;

export const zApproachPositionTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("approachPosition"),
    pos: zVec3f,
    allowDefaultNavigationAid: z.boolean().default(true),
  });

export type ApproachPositionTriggerDefinition = z.infer<
  typeof zApproachPositionTriggerDefinition
>;

export const zWearStoredTriggerDefinition = zBaseStoredTriggerDefinition.extend(
  {
    kind: z.literal("wear"),
    item: zItem,
    count: z.number(),
  }
);

export type WearStoredTriggerDefinition = z.infer<
  typeof zWearStoredTriggerDefinition
>;

export const zWearTypeStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("wearType"),
    typeId: zBiomesId,
    count: z.number(),
  });

export type WearTypeStoredTriggerDefinition = z.infer<
  typeof zWearTypeStoredTriggerDefinition
>;

export const zWarpHomeDestinationSpec = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("starter_location"),
  }),
  z.object({
    kind: z.literal("land"),
  }),
]);

export type WarpHomeDestinationSpec = z.infer<typeof zWarpHomeDestinationSpec>;

export const zLeafStoredTriggerDefinition = z.discriminatedUnion("kind", [
  // NOTE: YOU LIKELY DO NOT NEED TO USE THIS ANYMORE, JUST USE THE EVENT TRIGGER
  zEventStoredTriggerDefinition,

  // Old Leaf Nodes
  zBlueprintBuiltStoredTriggerDefinition,
  zCameraPhotoStoredTriggerDefinition,
  zChallengeClaimRewardsTriggerDefinition,
  zCompleteQuestStepAtMyRobotTriggerDefinition,
  zChallengeCompleteStoredTriggerDefinition,
  zChallengeUnlockedStoredTriggerDefinition,
  zCollectStoredTriggerDefinition,
  zCollectTypeStoredTriggerDefinition,
  zCraftStoredTriggerDefinition,
  zCraftTypeStoredTriggerDefinition,
  zEverCollectStoredTriggerDefinition,
  zEverCollectTypeStoredTriggerDefinition,
  zEverCraftStoredTriggerDefinition,
  zEverCraftTypeStoredTriggerDefinition,
  zInventoryHasStoredTriggerDefinition,
  zInventoryHasTypeStoredTriggerDefinition,
  zPlaceStoredTriggerDefinition,
  zWearStoredTriggerDefinition,
  zWearTypeStoredTriggerDefinition,
  zMapBeamStoredTriggerDefinition,
  zApproachPositionTriggerDefinition,
]);

export type LeafStoredTriggerDefinition = z.infer<
  typeof zLeafStoredTriggerDefinition
>;

export type StoredTriggerDefinition =
  /// Groups / recursive.
  | AllStoredTriggerDefinition
  | AnyStoredTriggerDefinition
  | SeqStoredTriggerDefinition
  | VariantStoredTriggerDefinition
  | LeafStoredTriggerDefinition;

export const zStoredTriggerDefinition = z.lazy(() =>
  z.discriminatedUnion("kind", [
    // Groups / recursive.
    zAllStoredTriggerDefinition,
    zAnyStoredTriggerDefinition,
    zSeqStoredTriggerDefinition,
    zVariantStoredTriggerDefinition,
    ...zLeafStoredTriggerDefinition.options,
  ])
) as ZodType<StoredTriggerDefinition>;

export type AllStoredTriggerDefinition = BaseStoredTriggerDefinition & {
  kind: "all";
  triggers: StoredTriggerDefinition[];
};

export const zAllStoredTriggerDefinition = zBaseStoredTriggerDefinition.extend({
  kind: z.literal("all"),
  triggers: zStoredTriggerDefinition.array(),
});

export type AnyStoredTriggerDefinition = BaseStoredTriggerDefinition & {
  kind: "any";
  triggers: StoredTriggerDefinition[];
};

export const zAnyStoredTriggerDefinition = zBaseStoredTriggerDefinition.extend({
  kind: z.literal("any"),
  triggers: zStoredTriggerDefinition.array(),
});

export type SeqStoredTriggerDefinition = BaseStoredTriggerDefinition & {
  kind: "seq";
  triggers: StoredTriggerDefinition[];
};

export const zSeqStoredTriggerDefinition = zBaseStoredTriggerDefinition.extend({
  kind: z.literal("seq"),
  triggers: zStoredTriggerDefinition.array(),
});

export const zVariantRollType = z.enum([
  "random",
  "first",
  "daily",
  "weekly",
  "monthly",
]);
export type VariantRollType = z.infer<typeof zVariantRollType>;

export type VariantStoredTriggerDefinition = BaseStoredTriggerDefinition & {
  kind: "variant";
  triggers: StoredTriggerDefinition[];
  rollType: VariantRollType;
};

export const zVariantStoredTriggerDefinition =
  zBaseStoredTriggerDefinition.extend({
    kind: z.literal("variant"),
    triggers: zStoredTriggerDefinition.array(),
    rollType: zVariantRollType,
  });
