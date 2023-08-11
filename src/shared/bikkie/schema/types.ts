import { zAclAction, zSpecialRoles } from "@/shared/acl_types";
import type { ShaperName } from "@/shared/asset_defs/shapers";
import { zShaperName } from "@/shared/asset_defs/shapers";
import type { ShapeName } from "@/shared/asset_defs/shapes";
import { zShapeName } from "@/shared/asset_defs/shapes";
import { makeAttributeType } from "@/shared/bikkie/attributes";
import type { IconSettings } from "@/shared/bikkie/schema/icons";
import { DEFAULT_ICON_SETTINGS } from "@/shared/bikkie/schema/icons";
import { type MinigameType } from "@/shared/ecs/gen/types";
import { getAclPreset } from "@/shared/game/acls_base";
import { zBagSpec } from "@/shared/game/bag_spec";
import {
  zBuffType,
  zBuffs,
  zBuffsAndProbabilities,
} from "@/shared/game/buff_specs";
import type { FertilizerEffect } from "@/shared/game/farming";
import {
  defaultFarmSpec,
  zFarmSpec,
  zFertilizerEffect,
} from "@/shared/game/farming";
import type { Item } from "@/shared/game/item";
import { zItem } from "@/shared/game/item";
import { zDropTable, zLootProbability } from "@/shared/game/item_specs";
import type { NavigationAid, TriggerIcon } from "@/shared/game/types";
import { zCameraMode, zNavigationAid, zTriggerIcon } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import { zFishingGameStatePredicate } from "@/shared/loot_tables/predicates";
import type { TransformList } from "@/shared/math/affine";
import { zAffineTransform } from "@/shared/math/affine";
import type { AABB, Vec3 } from "@/shared/math/types";
import { zAABB, zVec3f } from "@/shared/math/types";
import { zNpcEffectProfile } from "@/shared/npc/effect_profiles";
import type { NpcGlobals } from "@/shared/npc/npc_globals";
import { zNpcGlobals } from "@/shared/npc/npc_globals";
import { zBehavior } from "@/shared/npc/npc_types";
import { zSpawnConstraints } from "@/shared/npc/spawn_events";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zStoredTriggerDefinition } from "@/shared/triggers/schema";
import { withBikkieSchema } from "@/shared/zfs/bikkie_schema";
import { ok } from "assert";
import { cloneDeep, memoize } from "lodash";
import type { ZodNumber, ZodType, ZodTypeAny } from "zod";
import { z } from "zod";

//
//
// Core Schema Attribute Types
//

// Always true attribute type, useful for type class assertions.
export const bikkieTrue = makeAttributeType({
  zod: z.literal(true),
  defaultValue: true,
});

export const bikkieBoolean = makeAttributeType({
  zod: z.boolean(),
  defaultValue: false,
});

export const bikkieString = makeAttributeType({
  zod: z.string(),
  defaultValue: "",
});

export const bikkieNumber = makeAttributeType({
  zod: z.number(),
  defaultValue: 0,
});

export const bikkieBigInt = makeAttributeType({
  zod: z.bigint(),
  defaultValue: 0n,
});

export const bikkieCraftingStationIdSet = makeAttributeType({
  zod: zBiomesId.array(),
  defaultValue: async () => [],
});

export const bikkieDurationMs = makeAttributeType({
  zod: z.number().nonnegative(),
  defaultValue: 0,
});

export const bikkieEntityId = makeAttributeType({
  zod: zBiomesId,
  defaultValue: INVALID_BIOMES_ID,
});

export const bikkieDeedId = makeAttributeType({
  zod: zBiomesId,
  defaultValue: INVALID_BIOMES_ID,
});

export function bikkieBiscuitId(schemaPath?: string): ZodType<BiomesId> {
  if (schemaPath) {
    return withBikkieSchema(
      makeAttributeType({
        zod: zBiomesId,
        defaultValue: INVALID_BIOMES_ID,
      }),
      schemaPath
    );
  }
  return makeAttributeType({
    zod: zBiomesId,
    defaultValue: INVALID_BIOMES_ID,
  });
}

export const bikkieBagSpec = makeAttributeType({
  zod: zBagSpec,
  defaultValue: async () => [],
});

export const bikkieNpcBag = makeAttributeType({
  zod: zBagSpec,
  defaultValue: async () => [],
});

export const bikkieQuestGiverId = makeAttributeType({
  zod: zBiomesId,
  defaultValue: INVALID_BIOMES_ID,
});

export const bikkieGaloisPath = bikkieString;

export const bikkieColor = makeAttributeType({
  zod: z.string(),
  defaultValue: "black",
});

export const bikkieDropTable = makeAttributeType({
  zod: zDropTable,
  defaultValue: async () => [],
});

export const bikkieBuffsAndProbabilities = makeAttributeType({
  zod: zBuffsAndProbabilities,
  defaultValue: async () => [],
});

export const bikkieBuffs = makeAttributeType({
  zod: zBuffs,
  defaultValue: async () => [],
});

export const bikkieAABB = makeAttributeType({
  zod: zAABB,
  defaultValue: async () =>
    [
      [0, 0, 0],
      [0, 0, 0],
    ] as AABB,
});

export const bikkieBoxSize = makeAttributeType({
  zod: z.number().array().min(3).max(3) as unknown as ZodType<Vec3>,
  defaultValue: async () => [0, 0, 0] as Vec3,
});

const numberRangeAnnotation = Symbol.for("biomesNumberRangeAnnotation");
export interface NumberRangeParams {
  min?: number;
  max?: number;
  step?: number;
}
export function numberWithRange(params: NumberRangeParams): ZodType<number> {
  return z.number().annotate(numberRangeAnnotation, params);
}
export function isNumberRangeType(zod: ZodTypeAny): zod is ZodNumber {
  return zod.annotations?.[numberRangeAnnotation] !== undefined;
}
export function getNumberRange(zod: ZodTypeAny): NumberRangeParams {
  const numberRange = zod.annotations?.[numberRangeAnnotation];
  ok(numberRange !== undefined);
  return numberRange;
}

export const zProtectionSize = z
  .array(
    numberWithRange({
      min: 0,
      max: 128,
      step: 32,
    })
  )
  .min(3)
  .max(3)
  .default([0, 0, 0] as Vec3) as unknown as ZodType<Vec3>;

export type ProtectionSize = z.infer<typeof zProtectionSize>;

export const bikkieVolume = makeAttributeType({
  zod: z.discriminatedUnion("kind", [
    // A box centered around the origin.
    makeAttributeType({
      zod: z.object({
        kind: z.literal("box"),
        box: zProtectionSize,
      }),
      defaultValue: async () =>
        ({ kind: "box", box: [1, 1, 1] as Vec3 } as const),
    }),
    // A sphere centered around the origin.
    makeAttributeType({
      zod: z.object({
        kind: z.literal("sphere"),
        radius: bikkieNumber,
      }),
      defaultValue: async () => ({ kind: "sphere", radius: 1 } as const),
    }),
  ]),
  defaultValue: async () => ({ kind: "box", box: [1, 1, 1] as Vec3 } as const),
});
export type BikkieVolume = z.infer<typeof bikkieVolume>;

export const bikkieUnmuck = makeAttributeType({
  zod: z.object({
    volume: bikkieVolume,
    snapToGrid: z.number().default(1).optional(),
  }),
  defaultValue: async () =>
    ({
      volume: { kind: "box", box: [1, 1, 1] as Vec3 } as const,
      snapToGrid: undefined,
    } as const),
});
export type BikkieUnmuck = z.infer<typeof bikkieUnmuck>;

export const bikkkieNavigationAid = makeAttributeType({
  zod: zNavigationAid,
  defaultValue: async () =>
    <NavigationAid>{
      kind: "position",
      pos: [0, 0, 0],
    },
});

export const bikkieTriggerDefinition = makeAttributeType({
  zod: zStoredTriggerDefinition,
  defaultValue: async (context) =>
    <StoredTriggerDefinition>{
      kind: "seq",
      id: await context.generateId(),
      triggers: [],
    },
});

export const bikkieBuffType = makeAttributeType({
  zod: zBuffType,
  defaultValue: "food",
});

export const bikkieBehavior = makeAttributeType({
  zod: zBehavior,
  defaultValue: async () => ({}),
});

export const booleanModifierDefault = false; // Identity for the boolean "or" operator.
export const multiplicativeModifierDefault = 1; // Multiplicative identity.
export const additiveModifierDefault = 0; // Additive identity.

export const zBooleanModifier = z
  .object({ kind: z.literal("boolean"), enabled: z.boolean() })
  .default({ kind: "boolean", enabled: booleanModifierDefault })
  .optional();

export const zMultiplicativeModifier = z
  .object({ kind: z.literal("multiplicative"), multiplier: z.number() })
  .default({
    kind: "multiplicative",
    multiplier: multiplicativeModifierDefault,
  })
  .optional();

export const zAdditiveModifier = z
  .object({ kind: z.literal("additive"), increase: z.number() })
  .default({ kind: "additive", increase: additiveModifierDefault })
  .optional();

export const zPlayerModifier = z.union([
  zBooleanModifier,
  zMultiplicativeModifier,
  zAdditiveModifier,
]);

export type PlayerModifier = Exclude<
  z.infer<typeof zPlayerModifier>,
  undefined
>;

// NOTE: Avoid multiplicative multipliers; you can make additive modifier for
// a multiplier, but multiplication for a buff will affect other multipliers
// of the same buff and cause stacking behavior.
export const zPlayerModifiers = z.object({
  adminFarmingFast: zBooleanModifier.describe(
    "Speeds up farming so that 1 day of progress happens in 1 minute."
  ),
  adminFarmingNoWater: zBooleanModifier.describe(
    "Don't require water for farming."
  ),
  nightVision: zBooleanModifier.describe(
    "Change the brightness/darkness of the world."
  ),
  farmingSpeed: zAdditiveModifier.describe(
    "Change the speed at which crops grow. 1 means 1% less time, 2 means 2% less time"
  ),
  farmingCrossbreed: zAdditiveModifier.describe(
    "Additional chance for a crossbreed. 1 means 1% more chance."
  ),
  fly: zBooleanModifier.describe("Use fly controls."),
  peace: zBooleanModifier.describe("Makes enemies peaceful towards you."),
  underwaterBreathing: zBooleanModifier.describe(
    "Extra time until the player takes damage under water."
  ),
  speedAdd: zAdditiveModifier.describe(
    "Change the speed at which the player moves."
  ),
  swimmingSpeedAdd: zAdditiveModifier.describe(
    "Change the speed at which the player swims."
  ),
  jumpAdd: zAdditiveModifier.describe(
    "Change the height of jumps for the player."
  ),
  regenIntervalAdd: zAdditiveModifier.describe(
    "Changes the interval that a player regenerates health. (-0.5 means interval between regenerations is halved, and player will heal more twice as fast)"
  ),
  reach: zAdditiveModifier.describe(
    "Changes breaking, placement, attacking, etc... reach."
  ),
  jumpCount: zAdditiveModifier.describe(
    "Changes the number of extra jumps that a player can make."
  ),
  lavaImmunity: zBooleanModifier.describe("Immunity from taking lava damage."),
  maxHealth: zAdditiveModifier.describe(
    "Changes the maximum health of the player."
  ),
  attackDamage: zAdditiveModifier.describe(
    "Adds damage that the player does when attacking."
  ),
});
export type PlayerModifiers = z.infer<typeof zPlayerModifiers>;

export const zPlayerModifiersRequired = zPlayerModifiers.required();
export type PlayerModifiersRequired = z.infer<typeof zPlayerModifiersRequired>;

export const bikkiePlayerModifiers = makeAttributeType({
  zod: zPlayerModifiers,
  defaultValue: async () => ({}),
});

export const bikkieSpawnConstraints = makeAttributeType({
  zod: zSpawnConstraints,
  defaultValue: async () => ({
    terrainType: [],
  }),
});

export const bikkieSounds = makeAttributeType({
  zod: zNpcEffectProfile,
  defaultValue: async () => ({}),
});

export const bikkieBlockList = makeAttributeType({
  zod: zBiomesId.array(),
  defaultValue: async () => [],
});

export const bikkieNpcGlobals = makeAttributeType({
  zod: zNpcGlobals,
  defaultValue: async () =>
    <NpcGlobals>{
      knockback: {
        popup: 1.5,
        force: 16,
      },
      gravity: 30,
      wardRange: 16,
      playerAttackInterval: 0.25,
    },
});

export const bikkieTriggerIcon = makeAttributeType({
  zod: zTriggerIcon,
  defaultValue: async () =>
    <TriggerIcon>{
      kind: "none",
    },
});

export const zDamageOnContact = z.object({
  damage: z
    .number()
    .default(0)
    .describe(
      "The amount of damage dealt per damage tick. Units are in percentage of a player's health bar."
    ),
  secondsUntilFirstDamage: z
    .number()
    .default(1)
    .describe("The amount of time before damage starts to be dealt."),
  secondsBetweenDamage: z
    .number()
    .default(1)
    .describe("The amount of time between consecutive damage ticks."),
});

export type DamageOnContact = z.infer<typeof zDamageOnContact>;

export const bikkieDamageOnContact = makeAttributeType({
  zod: zDamageOnContact,
  defaultValue: async () => zDamageOnContact.parse({}),
});

export const zSurfaceSlip = z.object({
  frictionMultiplier: z
    .number()
    .default(0.1)
    .describe("Multiplier for the amount of friction on the surface."),
  forceMultiplier: z
    .number()
    .default(0.2)
    .describe(
      "Multiplier for the amount of force that can be applied to move on this surface."
    ),
  maxSpeed: z.number().default(15).describe("Max speed on this surface."),
});

export type SurfaceSlip = z.infer<typeof zSurfaceSlip>;

export const bikkieSurfaceSlip = makeAttributeType({
  zod: zSurfaceSlip,
  defaultValue: async () => zSurfaceSlip.parse({}),
});

export const bikkieFarming = makeAttributeType({
  zod: zFarmSpec,
  defaultValue: async () => defaultFarmSpec("basic"),
});

export const bikkieItemTypeSet = makeAttributeType({
  zod: zBiomesId.array(),
  defaultValue: async () => [],
});

export const bikkieShape = makeAttributeType({
  zod: zShapeName,
  defaultValue: async () => <ShapeName>"full",
});

export const bikkieShaper = makeAttributeType({
  zod: zShaperName,
  defaultValue: async () => <ShaperName>"stepper",
});

export const bikkieFertilizerEffect = makeAttributeType({
  zod: zFertilizerEffect,
  defaultValue: async () =>
    <FertilizerEffect>{
      kind: "time",
      timeMs: 1000 * 60 * 60,
    },
});

export const bikkieItem = makeAttributeType({
  zod: z.lazy(memoize(() => zItem)),
  defaultValue: async () =>
    <Item>{
      id: INVALID_BIOMES_ID,
    },
});

export const zCraftingStationType = z.enum([
  "general",
  "cooking",
  "dying",
  "composting",
]);
export type CraftingStationType = z.infer<typeof zCraftingStationType>;
export const bikkieCraftingStationType = makeAttributeType({
  zod: zCraftingStationType,
  defaultValue: async () => <CraftingStationType>"general",
});

export const bikkieCollectionCategory = makeAttributeType({
  zod: zBiomesId,
  defaultValue: async () => INVALID_BIOMES_ID,
});

export const zFishLengthDistribution = z.object({
  mean: z.number(),
  min: z.number(),
  variance: z.number().optional(),
});
export type FishLengthDistribution = z.infer<typeof zFishLengthDistribution>;

export const bikkieFishLengthDistribution = makeAttributeType({
  zod: zFishLengthDistribution,
  defaultValue: async () => <FishLengthDistribution>{ mean: 1, min: 0.1 },
});

export const zFishMinigameAdjustments = z.object({
  // Catch adjustments
  velocityOffset: z.number().optional(),
  barSizeOffset: z.number().optional(),
  barFillIncreaseOffset: z.number().optional(),
  barFillDecreaseOffset: z.number().optional(),
  // Bite adjustments
  biteTimeOffset: z.number().optional(),
  biteDurationOffset: z.number().optional(),

  // Deprecated
  barFillOffset: z.number().optional(),
});
export type FishMinigameAdjustments = z.infer<typeof zFishMinigameAdjustments>;

export const bikkieFishMinigameAdjustments = makeAttributeType({
  zod: zFishMinigameAdjustments,
  defaultValue: async () => <FishMinigameAdjustments>{},
});

export const zActionSet = z.set(zAclAction);

export const zProtectionAcls = z.object({
  everyone: zActionSet.default(new Set()).optional(),
  roles: z
    .map(zSpecialRoles, zActionSet.default(new Set(getAclPreset("Admin"))))
    .default(new Map())
    .optional(),
});
export type ProtectionAcls = z.infer<typeof zProtectionAcls>;

export const zProtectionProjection = z.object({
  size: zProtectionSize,
  protection: z
    .object({
      acls: zProtectionAcls.default({}),
    })
    .default({
      acls: {},
    })
    .optional(),
  restoration: z
    .object({
      restoreDelaySeconds: z
        .number()
        .describe(
          "Amount of time to wait, in seconds, before changes are restored."
        ),
      acls: zProtectionAcls.default({}),
    })
    .default({
      restoreDelaySeconds: 10,
      acls: {},
    })
    .optional()
    .describe("If set, enables restoration."),
  snapToGrid: z.number().default(1).optional(),
});
export type ProtectionProjection = z.infer<typeof zProtectionProjection>;
export const protectionProjection = makeAttributeType({
  zod: zProtectionProjection,
  defaultValue: async () =>
    <ProtectionProjection>{
      size: [8, 8, 8],
      snapToGrid: undefined,
      protection: {},
    },
});

export const zFishCondition = z.object({
  predicates: z.array(zFishingGameStatePredicate),
  probability: zLootProbability,
});
export type FishCondition = z.infer<typeof zFishCondition>;
export const bikkieFishConditions = makeAttributeType({
  zod: zFishCondition.array(),
  defaultValue: async () =>
    <FishCondition[]>[{ predicates: [], probability: "common" }],
});

export const zRepeatableCadence = z.enum([
  "never",
  "always",
  "daily",
  "weekly",
  "monthly",
]);
export type RepeatableCadence = z.infer<typeof zRepeatableCadence>;
export const bikkieRepeatableCadence = makeAttributeType({
  zod: zRepeatableCadence,
  defaultValue: async () => <RepeatableCadence>"never",
});

export const zReadable = z.enum(["sheet", "immsersive"]);
export type Readable = z.infer<typeof zReadable>;
export const bikkieReadable = makeAttributeType({
  zod: zReadable,
  defaultValue: async () => <Readable>"sheet",
});

export const zQuestCategory = z.enum([
  "fishing",
  "farming",
  "cooking",
  "mining",
  "puzzle",
  "hunting",
  "main",
  "camera",
  "discover",
]);
export type QuestCategory = z.infer<typeof zQuestCategory>;
export const bikkieQuestCategory = makeAttributeType({
  zod: zQuestCategory,
  defaultValue: async () => <QuestCategory>"fishing",
});

export const bikkieTransform = makeAttributeType({
  zod: zAffineTransform,
  defaultValue: async () =>
    <TransformList>{
      kind: "list",
      transforms: [],
    },
});

export const bikkieIconSettings = makeAttributeType({
  zod: z.object({
    cameraDir: zVec3f.optional(),
    lightingDir: zVec3f.optional(),
    brightness: z.number().optional(),
    contrast: z.number().optional(),
    saturation: z.number().optional(),
  }),
  defaultValue: async () => cloneDeep(DEFAULT_ICON_SETTINGS),
}) as ZodType<IconSettings>;

export const zMetaquestPoints = z.object({
  metaquest: zBiomesId,
  points: z.number(),
});
export type MetaquestPoints = z.infer<typeof zMetaquestPoints>;
export const bikkieMetaquestPoints = makeAttributeType({
  zod: zMetaquestPoints.array(),
  defaultValue: async () => [
    {
      metaquest: INVALID_BIOMES_ID,
      points: 0,
    },
  ],
});

export const PlacementType = z.enum(["floorCenter", "wallCenter", "any"]);
export type PlacementType = z.infer<typeof PlacementType>;
export const bikkiePlacementType = makeAttributeType({
  zod: PlacementType,
  defaultValue: async () => <PlacementType>"floorCenter",
});

export const zCompatibleMinigames = z.set(
  z.enum(["spleef", "deathmatch", "simple_race"])
);
export type CompatibleMinigames = z.infer<typeof zCompatibleMinigames>;
export const bikkieCompatibleMinigames = makeAttributeType({
  zod: zCompatibleMinigames,
  defaultValue: async () => new Set<MinigameType>(), // Also checks enum is valid
});

export const bikkiePaletteColor = makeAttributeType({
  zod: z.string(),
  defaultValue: async () => "",
});

export const bikkiePredicateSet = makeAttributeType({
  zod: z.set(zBiomesId),
  defaultValue: async () => new Set<BiomesId>(),
});

export const zBuildingRequirements = z.enum(["none", "roof", "noRoof"]);
export type BuildingRequirements = z.infer<typeof zBuildingRequirements>;
export const bikkieBuildingRequirements = makeAttributeType({
  zod: zBuildingRequirements,
  defaultValue: async () => <BuildingRequirements>"none",
});

export interface TextSignConfiguration {
  line_count: number;
  max_line_length: number;
  background_color: string;
}

export const DEFAULT_TEXT_SIGN_CONFIGURATION: TextSignConfiguration = {
  line_count: 3,
  max_line_length: 12,
  background_color: "#000000",
};

export const bikkieTextSignConfiguration = makeAttributeType({
  zod: z.object({
    line_count: z.number().default(3),
    max_line_length: z.number().default(12),
    background_color: z.string().default("#000000"),
  }),
  defaultValue: async () => cloneDeep(DEFAULT_TEXT_SIGN_CONFIGURATION),
}) as ZodType<TextSignConfiguration>;

export const zCameraItemMode = z
  .union([
    z
      .object({
        kind: z.literal("fps"),
        label: z.string(),
        zoom: z.number().default(1),
        modeType: zCameraMode,
      })
      .default({
        kind: "fps",
        label: "First Person",
        modeType: "fps",
        zoom: 1,
      }),
    z
      .object({
        kind: z.literal("selfie"),
        label: z.string(),
        modeType: zCameraMode,
      })
      .default({
        kind: "selfie",
        label: "Selfie",
        modeType: "selfie",
      }),
    z
      .object({
        kind: z.literal("isometric"),
        quadrant: z.enum(["ne", "nw", "sw", "se"]),
        label: z.string(),
        modeType: zCameraMode,
      })
      .default({
        kind: "isometric",
        quadrant: "ne",
        label: "Isometric",
        modeType: "isometric",
      }),
  ])
  .default({
    kind: "fps",
    label: "First Person",
    modeType: "fps",
    zoom: 1,
  });

export type CameraItemMode = z.infer<typeof zCameraItemMode>;

export const DEFAULT_CAMERA_ITEM_MODE: CameraItemMode = {
  kind: "fps",
  label: "First Person",
  modeType: "fps",
  zoom: 1,
};

export const bikkieCameraModes = makeAttributeType({
  zod: zCameraItemMode.array(),
  defaultValue: async () => [cloneDeep(DEFAULT_CAMERA_ITEM_MODE)],
});

export const zLight = z.object({
  color: zVec3f,
  intensity: z.number(),
});
export type Light = z.infer<typeof zLight>;
export const bikkieLight = makeAttributeType({
  zod: zLight,
  defaultValue: async () => {
    return {
      color: [255, 255, 255] as Vec3,
      intensity: 15,
    };
  },
});

const zSelectionNameGenerator = makeAttributeType({
  zod: z
    .object({
      kind: z.literal("selection"),
      options: z.string(),
    })
    .describe("Comma separated list of names"),
  defaultValue: async () =>
    ({
      kind: "selection",
      options: "Jackie, David, Runna, Richard, Emily",
    } as any),
});

const zRandomNameGenerator = makeAttributeType({
  zod: z.object({
    kind: z.literal("random"),
  }),
  defaultValue: async () => ({ kind: "random" } as any),
});

export const zNameGenerator = z.discriminatedUnion("kind", [
  zSelectionNameGenerator,
  zRandomNameGenerator,
]);
export type NameGenerator = z.infer<typeof zNameGenerator>;

export const bikkieNpcNameGenerator = makeAttributeType({
  zod: zNameGenerator,
  defaultValue: async () => ({ kind: "random" } as NameGenerator),
});

const zRandomAppearanceGenerator = makeAttributeType({
  zod: z.object({
    kind: z.literal("randomAppearance"),
  }),
  defaultValue: async () => ({ kind: "randomAppearance" } as any),
});

const zRandomWearablesGenerator = makeAttributeType({
  zod: z.object({
    kind: z.literal("randomWearables"),
  }),
  defaultValue: async () => ({ kind: "randomWearables" } as any),
});

export const zNpcAppearanceGenerator = z.object({
  randomAppearance: zRandomAppearanceGenerator.optional(),
  randomWearables: zRandomWearablesGenerator.optional(),
});

export type NpcAppearanceGenerator = z.infer<typeof zNpcAppearanceGenerator>;

export const bikkieNpcAppearanceGenerator = makeAttributeType({
  zod: zNpcAppearanceGenerator,
  defaultValue: async () =>
    ({
      randomAppearance: { kind: "randomAppearance" },
      randomWearables: { kind: "randomWearables" },
    } as NpcAppearanceGenerator),
});
