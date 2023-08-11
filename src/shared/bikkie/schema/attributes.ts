import type { ShaperName } from "@/shared/asset_defs/shapers";
import type { ShapeName } from "@/shared/asset_defs/shapes";
import { bakeAttributes } from "@/shared/bikkie/attributes";
import type {
  AbstractBiscuit,
  BiscuitFromAttributeSelection,
  SelectFallbackAttributes,
} from "@/shared/bikkie/core";
import type { AnimationInfo } from "@/shared/bikkie/schema/animation";
import { zAnimationInfo } from "@/shared/bikkie/schema/animation";
import type { AnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import { typedBinaryAttribute } from "@/shared/bikkie/schema/binary";
import type { IconSettings } from "@/shared/bikkie/schema/icons";
import type {
  BikkieUnmuck,
  BuildingRequirements,
  CameraItemMode,
  CompatibleMinigames,
  CraftingStationType,
  DamageOnContact,
  FishCondition,
  FishLengthDistribution,
  FishMinigameAdjustments,
  Light,
  MetaquestPoints,
  NameGenerator,
  NpcAppearanceGenerator,
  PlacementType,
  PlayerModifiers,
  ProtectionProjection,
  QuestCategory,
  Readable,
  RepeatableCadence,
  SurfaceSlip,
  TextSignConfiguration,
} from "@/shared/bikkie/schema/types";
import {
  bikkieAABB,
  bikkieBagSpec,
  bikkieBehavior,
  bikkieBigInt,
  bikkieBiscuitId,
  bikkieBlockList,
  bikkieBoolean,
  bikkieBoxSize,
  bikkieBuffType,
  bikkieBuffs,
  bikkieBuffsAndProbabilities,
  bikkieBuildingRequirements,
  bikkieCameraModes,
  bikkieColor,
  bikkieCompatibleMinigames,
  bikkieCraftingStationIdSet,
  bikkieCraftingStationType,
  bikkieDamageOnContact,
  bikkieDeedId,
  bikkieDropTable,
  bikkieDurationMs,
  bikkieEntityId,
  bikkieFarming,
  bikkieFertilizerEffect,
  bikkieFishConditions,
  bikkieFishLengthDistribution,
  bikkieFishMinigameAdjustments,
  bikkieGaloisPath,
  bikkieIconSettings,
  bikkieLight,
  bikkieMetaquestPoints,
  bikkieNpcAppearanceGenerator,
  bikkieNpcBag,
  bikkieNpcGlobals,
  bikkieNpcNameGenerator,
  bikkieNumber,
  bikkiePaletteColor,
  bikkiePlacementType,
  bikkiePlayerModifiers,
  bikkiePredicateSet,
  bikkieQuestCategory,
  bikkieQuestGiverId,
  bikkieReadable,
  bikkieRepeatableCadence,
  bikkieShape,
  bikkieShaper,
  bikkieSounds,
  bikkieSpawnConstraints,
  bikkieString,
  bikkieSurfaceSlip,
  bikkieTextSignConfiguration,
  bikkieTransform,
  bikkieTriggerDefinition,
  bikkieTriggerIcon,
  bikkieTrue,
  bikkieUnmuck,
  bikkkieNavigationAid,
  protectionProjection,
} from "@/shared/bikkie/schema/types";
import type { BagSpec } from "@/shared/game/bag_spec";
import type {
  BuffType,
  Buffs,
  BuffsAndProbabilities,
} from "@/shared/game/buff_specs";
import type { FarmSpec, FertilizerEffect } from "@/shared/game/farming";
import type { DropTable } from "@/shared/game/item_specs";
import type { NavigationAid, TriggerIcon } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import type { AffineTransform } from "@/shared/math/affine";
import type { AABB, Vec3 } from "@/shared/math/types";
import type { NpcEffectProfile } from "@/shared/npc/effect_profiles";
import type { NpcGlobals } from "@/shared/npc/npc_globals";
import type { Behavior } from "@/shared/npc/npc_types";
import type { SpawnConstraints } from "@/shared/npc/spawn_events";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { isBinaryData } from "@/shared/util/binary";
import { compactMap } from "@/shared/util/collections";
import { ok } from "assert";
import { memoize, values } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

//
// Core Schema Attributes
//
// To add a new attribute, add it to the schema description below; and then
// also add the corresponding type to the Biscuit interface. Both are required
// to work around Typescript type recursion limits.
//

export const attribs = bakeAttributes({
  // All Attributes Below 200 are reserved for ECS (For now)
  // 201: Deprecated
  202: {
    name: "stackable",
    type: () => bikkieBigInt,
    help: "How many of this item can be stacked in a single slot.",
  },
  // 203: Deprecated
  204: {
    name: "isDroppable",
    type: () => bikkieTrue,
    help: "Whether this item can be dropped.",
  },
  205: {
    name: "displayName",
    type: () => bikkieString,
    help: "The name of the item as it appears in the game.",
    fallbackValue: () => "???",
  },
  206: {
    name: "displayDescription",
    type: () => bikkieString,
    help: "The long description, used on things like Quests",
  },
  207: {
    name: "displayTooltip",
    type: () => bikkieString,
    help: "The tooltip, use in the inventory",
  },
  208: {
    name: "craftWith",
    niceName: "Crafting Station",
    type: () => bikkieCraftingStationIdSet,
    description: "If empty, it is handcraftable.",
  },
  209: {
    name: "craftingDurationMs",
    niceName: "Crafting Duration (ms)",
    type: () => bikkieDurationMs,
  },
  210: {
    name: "galoisPath",
    type: () => bikkieGaloisPath,
    help: "Path to Galois art assets used to render this Biscuit.",
  },
  211: {
    name: "craftingCategory",
    type: () => bikkieString,
    help: "Category of this item in crafting displays.",
    fallbackValue: () => "Item",
  },
  // 212: Deprecated.
  // 213: Deprecated,
  214: {
    name: "galoisIcon",
    type: () => bikkieString,
  },
  215: {
    name: "action",
    type: () => bikkieString,
  },
  216: {
    name: "deletesOnDrop",
    type: () => bikkieTrue,
  },
  217: {
    name: "entityId",
    type: () => bikkieEntityId,
  },
  218: {
    name: "chargesAt",
    type: () => bikkieNumber,
  },
  219: {
    name: "chargeTime",
    type: () => bikkieDurationMs,
  },
  // 220: Deprecated
  221: {
    name: "extraCharge",
    type: () => bikkieNumber,
  },
  222: {
    name: "dischargesAt",
    type: () => bikkieNumber,
  },
  // 223: Deprecated
  // 224: Deprecated
  // 225: Deprecated
  226: {
    name: "tooltipTypeName",
    help: "Type name used in tooltips",
    type: () => bikkieString,
  },
  227: {
    name: "output",
    type: () => bikkieBagSpec,
  },
  228: {
    name: "input",
    type: () => bikkieBagSpec,
  },
  // 229: Deprecated.
  230: {
    name: "meshGaloisPath",
    type: () => bikkieGaloisPath,
  },
  231: {
    name: "groupId",
    type: () => bikkieEntityId,
  },
  232: {
    name: "rotation",
    type: () => bikkieNumber,
  },
  233: {
    name: "seedDrop",
    description:
      "What this drops in addition when destroyed for the first time.",
    type: () => bikkieDropTable,
  },
  234: {
    name: "hardnessClass",
    type: () => bikkieNumber,
    fallbackValue: () => 0,
  },
  235: {
    name: "dyedWith",
    type: () => bikkieBiscuitId("/dyes"),
  },
  236: {
    name: "dyeColor",
    type: () => bikkieColor,
  },
  237: {
    name: "terrainName",
    type: () => bikkieString,
  },
  238: {
    name: "preferredDestroyerClass",
    type: () => bikkieNumber,
  },
  240: {
    name: "deedId",
    type: () => bikkieDeedId,
  },
  241: {
    name: "turnsInto",
    type: () => bikkieBiscuitId("/items"),
  },
  242: {
    name: "drop",
    type: () => bikkieDropTable,
    description: "What this drops when destroyed.",
  },
  243: {
    name: "numSlots",
    type: () => bikkieNumber,
  },
  244: {
    name: "numCols",
    type: () => bikkieNumber,
  },
  246: {
    name: "fishLength",
    type: () => bikkieNumber,
  },
  247: {
    name: "preferredDrop",
    type: () => bikkieDropTable,
    description: "What this drops when destroyed with the preferred tool.",
  },
  248: {
    name: "destroyerClass",
    type: () => bikkieNumber,
  },
  249: {
    name: "dps",
    niceName: "Damage Per Second",
    type: () => bikkieNumber,
  },
  250: {
    name: "lifetimeDurabilityMs",
    type: () => bikkieDurationMs,
  },
  251: {
    name: "shape",
    type: () => bikkieShape,
  },
  252: {
    name: "buffs",
    type: () => bikkieBuffsAndProbabilities,
  },
  253: {
    name: "isCurrency",
    type: () => bikkieTrue,
  },
  254: {
    name: "wearAsHat",
    type: () => bikkieTrue,
    help: "Wear as hat",
  },
  255: {
    name: "wearAsOuterwear",
    type: () => bikkieTrue,
    help: "Wear as outerwear",
  },
  256: {
    name: "wearAsTop",
    type: () => bikkieTrue,
    help: "Wear as top",
  },
  257: {
    name: "wearAsBottoms",
    type: () => bikkieTrue,
    help: "Wear as bottoms",
  },
  258: {
    name: "wearOnFeet",
    type: () => bikkieTrue,
    help: "Wear on feet",
  },
  259: {
    name: "wearAsHair",
    type: () => bikkieTrue,
    help: "Wear as hair",
  },
  260: {
    name: "wearOnFace",
    type: () => bikkieTrue,
    help: "Wear on face",
  },
  261: {
    name: "wearOnEars",
    type: () => bikkieTrue,
    help: "Wear on ears",
  },
  262: {
    name: "wearOnNeck",
    type: () => bikkieTrue,
    help: "Wear on neck",
  },
  263: {
    name: "wearOnHands",
    type: () => bikkieTrue,
    help: "Wear on hands",
  },
  264: {
    name: "isCraftingStation",
    type: () => bikkieTrue,
  },
  265: {
    name: "isFish",
    type: () => bikkieTrue,
  },
  266: {
    name: "isBlock",
    type: () => bikkieTrue,
  },
  267: {
    name: "isHead",
    type: () => bikkieTrue,
  },
  268: {
    name: "isTool",
    type: () => bikkieTrue,
  },
  269: {
    name: "isWearable",
    type: () => bikkieTrue,
  },
  // 270: Deprecated.
  271: {
    name: "duration",
    niceName: "Duration (ms)",
    type: () => bikkieDurationMs,
  },
  272: {
    name: "data",
    type: () => bikkieString,
  },
  273: {
    name: "buffType",
    type: () => bikkieBuffType,
  },
  274: {
    name: "minigameId",
    type: () => bikkieEntityId,
  },
  275: {
    name: "isBurnable",
    type: () => bikkieTrue,
  },
  276: {
    name: "isRecipe",
    type: () => bikkieTrue,
  },
  277: {
    name: "isBlueprint",
    type: () => bikkieTrue,
  },
  278: {
    name: "isPlaceable",
    type: () => bikkieTrue,
  },
  // 279: Deprecated.
  // 280: Deprecated
  281: {
    name: "isBuild",
    type: () => bikkieTrue,
  },
  282: {
    name: "isContainer",
    type: () => bikkieTrue,
  },
  283: {
    name: "isDoor",
    type: () => bikkieTrue,
  },
  284: {
    name: "isFrame",
    type: () => bikkieTrue,
  },
  285: {
    name: "isShopContainer",
    type: () => bikkieTrue,
  },
  286: {
    name: "isSeed",
    type: () => bikkieTrue,
  },
  287: {
    name: "isConsumable",
    type: () => bikkieTrue,
  },
  288: {
    name: "isLog",
    type: () => bikkieTrue,
  },
  289: {
    name: "isLumber",
    type: () => bikkieTrue,
  },
  290: {
    name: "isAnyStone",
    type: () => bikkieTrue,
  },
  291: {
    name: "isPickaxe",
    type: () => bikkieTrue,
  },
  292: {
    name: "isAxe",
    type: () => bikkieTrue,
  },
  293: {
    name: "breakVerb",
    type: () => bikkieString,
  },
  294: {
    name: "typeOnLeaderboard",
    type: () => bikkieString,
  },
  295: {
    name: "isBait",
    type: () => bikkieTrue,
  },
  // 296: Deprecated
  297: {
    name: "description",
    type: () => bikkieString,
  },
  298: {
    name: "rewards",
    type: () => bikkieBagSpec,
  },
  299: {
    name: "navigationAid",
    type: () => bikkkieNavigationAid,
  },
  300: {
    name: "unlock",
    niceName: "Unlocked by",
    type: () => bikkieTriggerDefinition,
  },
  // 301: Deprecated: checkpoint number.
  302: {
    name: "particleIcon",
    type: () => bikkieString,
  },
  303: {
    name: "boxSize",
    type: () => bikkieBoxSize,
    help: "XYZ size of a bounding box, in voxels.",
  },
  304: {
    name: "maxCount",
    type: () => bikkieNumber,
    help: "Absolute maximum number of entities that can exist in the world at any time.",
  },
  305: {
    name: "rotateSpeed",
    type: () => bikkieNumber,
    niceName: "Rotate Speed (deg/s)",
  },
  306: {
    name: "walkSpeed",
    type: () => bikkieNumber,
    help: "The NPC's walking speed. This value is referenced by various behaviors that involve walking.",
  },
  307: {
    name: "runSpeed",
    type: () => bikkieNumber,
    help: "The NPC's run speed. This value is referenced by various behaviors that involve running.",
  },
  308: {
    name: "ttl",
    type: () => bikkieNumber,
    niceName: "Time to Live (seconds)",
  },
  309: {
    name: "effectsProfile",
    type: () => bikkieBiscuitId("/npcs/effectsProfiles"),
    help: "An effects profile that describes the kind of sound (and other) effects that play during certain events.",
  },
  310: {
    name: "behavior",
    type: () => bikkieBehavior,
    help: "A customizable set of behaviors that dictate how the NPC moves and how players interact with it.",
  },
  311: {
    name: "npcBag",
    type: () => bikkieNpcBag,
    help: "Describes which NPCs will spawn when this spawn event is triggered.",
  },
  312: {
    name: "spawnConstraints",
    type: () => bikkieSpawnConstraints,
    help: "Describes the constraints on where/how this spawn event can occur.",
  },
  313: {
    name: "enabled",
    type: () => bikkieBoolean,
    help: "If unset, this biscuit event will not be activated.",
  },
  314: {
    name: "density",
    type: () => bikkieNumber,
    help: "Describes the maximum number of instances of this spawn event that can be present in the world at any given time, as a fraction of the number of candidate spawn points that exist. If there the spawn event only spawns on stone, and there's 10 stone tiles in the world, then a value of 1 would imply a maximum of 10 spawn events.",
  },
  315: {
    name: "playerModifiers",
    type: () => bikkiePlayerModifiers,
  },
  316: {
    name: "npcDefaultDialog",
    type: () => bikkieString,
  },
  317: {
    name: "stationSupportsHandcraft",
    type: () => bikkieBoolean,
    fallbackValue: () => false,
  },
  318: {
    name: "sounds",
    type: () => bikkieSounds,
    help: "Describes the sounds that play when certain events occur.",
  },
  319: {
    name: "npcGlobals",
    type: () => bikkieNpcGlobals,
    help: "Describes the global variables that affect all NPCs.",
  },
  320: {
    name: "trigger",
    type: () => bikkieTriggerDefinition,
  },
  321: {
    name: "questGiver",
    type: () => bikkieQuestGiverId,
  },
  322: {
    name: "isSideQuest",
    type: () => bikkieTrue,
  },
  323: {
    name: "isQuestGiver",
    type: () => bikkieTrue,
  },
  324: {
    name: "plantableBlocks",
    type: () => bikkieBlockList,
    help: "A list of blocks that this item can be planted in.",
  },
  325: {
    name: "isQuest",
    type: () => bikkieTrue,
  },
  326: {
    name: "triggerIcon",
    type: () => bikkieTriggerIcon,
  },
  327: {
    name: "isBlessed",
    type: () => bikkieTrue,
    help: "Items that will be given by /admin bless",
  },
  328: {
    name: "questAcceptText",
    type: () => bikkieString,
  },
  329: {
    name: "questDeclineText",
    type: () => bikkieString,
  },
  330: {
    name: "acceptsBait",
    type: () => bikkieTrue,
    help: "Does rod accept bait",
  },
  331: {
    name: "catchBarSize",
    type: () => bikkieNumber,
    help: "Size of catch bar 0-1",
  },
  332: {
    name: "damageOnContact",
    type: () => bikkieDamageOnContact,
    help: "Causes a block to deal damage to players that stand on it.",
  },
  333: {
    name: "facialHair",
    type: () => bikkieTrue,
  },
  334: {
    name: "surfaceSlip",
    type: () => bikkieSurfaceSlip,
    help: "Parameters to change a blocks surface physics. Can make a block's surface slippery.",
  },
  335: {
    name: "waterAmount",
    type: () => bikkieNumber,
    help: "Amount of water in this item",
    fallbackValue: () => 0,
  },
  336: {
    name: "abstract",
    type: () => bikkieTrue,
    help: "If set, this item will not be available on the client.",
  },
  337: {
    name: "deprecated",
    type: () => bikkieTrue,
    help: "This biscuit is deprecated and should not be used.",
  },
  338: {
    name: "isPlayerLikeAppearance",
    type: () => bikkieTrue,
    help: "If set, this item will be rendered like a player.",
  },
  339: {
    name: "isTemplate",
    type: () => bikkieTrue,
    help: "The blueprint should accept any block.",
  },
  // 340: Deprecated: itemBuyerOfTypes
  341: {
    name: "itemSellPrice",
    type: () => bikkieNumber,
  },
  // 342: Deprecated: questAcceptGift
  // 343: Deprecated: questAcceptPickGift
  344: {
    name: "isTillable",
    type: () => bikkieTrue,
  },
  345: {
    name: "farming",
    type: () => bikkieFarming,
    help: "Farming sim behavior when planted",
  },
  346: {
    name: "minDestructionTimeMs",
    type: () => bikkieNumber,
    fallbackValue: () => 0,
    help: "The minimum time this block requires to break any block. Allows for some tools to break things more slowly, like a hoe for flora",
  },
  347: {
    name: "isMediaPlayer",
    type: () => bikkieTrue,
  },
  348: {
    name: "isUncollideable",
    type: () => bikkieTrue,
  },
  349: {
    name: "fertilizerEffect",
    type: () => bikkieFertilizerEffect,
  },
  350: {
    name: "collectionDisplayItem",
    type: () => bikkieBiscuitId("/items"),
  },
  351: {
    name: "isHidden",
    type: () => bikkieTrue,
    help: "Hidden from players in areas that list biscuits",
  },
  352: {
    name: "craftingStationType",
    type: () => bikkieCraftingStationType,
  },
  353: {
    name: "isCompostable",
    type: () => bikkieTrue,
  },
  354: {
    name: "isFruit",
    type: () => bikkieTrue,
  },
  355: {
    name: "isVegetable",
    type: () => bikkieTrue,
  },
  356: {
    name: "collectionCategory",
    type: () => bikkieBiscuitId("/collectionCategories"),
  },
  357: {
    name: "isCollectionCategory",
    type: () => bikkieTrue,
  },
  // 358: Deprecated: requiresRoof
  359: {
    name: "isDefault",
    type: () => bikkieTrue,
    help: "If set an item is a default the player is given, e.g. a recipe",
  },
  360: {
    name: "isEnduring",
    type: () => bikkieTrue,
  },
  361: {
    name: "isCollidable",
    type: () => bikkieTrue,
    help: "If set for flora, entities will collide with it.",
  },
  362: {
    name: "isDyeable",
    type: () => bikkieTrue,
    help: "If set for a block, it is dyable.",
  },
  363: {
    name: "lifetime",
    type: () => bikkieNumber,
    help: "Set a block's lifetime.",
  },
  364: {
    name: "isEmissive",
    type: () => bikkieTrue,
    help: "If set for a block, it will be emissive.",
  },
  365: {
    name: "isPet",
    type: () => bikkieTrue,
    help: "Whether this is a pet or not.",
  },
  // 366: Deprecated
  367: {
    name: "fishLengthDistribution",
    type: () => bikkieFishLengthDistribution,
    help: "Fish length distribution",
  },
  368: {
    name: "fishMinigameAdjustments",
    type: () => bikkieFishMinigameAdjustments,
    help: "Adjustments to fishing minigame params",
  },
  369: {
    name: "isMuckwaterFish",
    type: () => bikkieTrue,
    help: "Whether this is a muckwater fish or not.",
  },
  370: {
    name: "isClearwaterFish",
    type: () => bikkieTrue,
    help: "Whether this is a clearwater fish or not.",
  },
  371: {
    name: "projectsProtection",
    type: () => protectionProjection,
    help: "Whether this item projects its ACLs to its domain.",
  },
  372: {
    name: "turnsIntoRotation",
    type: () => bikkieNumber,
    help: "How to rotate the turnsInto entity.",
  },
  373: {
    name: "customInspectText",
    type: () => bikkieString,
    help: "For interactable elements, set the label used when [F] inspecting (i.e. Talk, Open, Read)",
  },
  374: {
    name: "requiresWand",
    type: () => bikkieTrue,
    help: "Whether blueprint requires wand for completion.",
  },
  375: {
    name: "interactPattern",
    type: () => bikkieAABB,
    help: "Blocks to affect with this tool",
  },
  376: {
    name: "isChargeable",
    type: () => bikkieTrue,
    help: "Whether item can be charged.",
  },
  377: {
    name: "isDischargeable",
    type: () => bikkieTrue,
    help: "Whether item can be discharged.",
  },
  378: {
    name: "muckDrop",
    type: () => bikkieDropTable,
    help: "Loot table for when in muck",
  },
  379: {
    name: "muckPreferredDrop",
    type: () => bikkieDropTable,
    help: "Loot table for when in muck and preferred tool is used",
  },
  380: {
    name: "fishConditions",
    type: () => bikkieFishConditions,
    help: "Conditions for this item to be fishable",
  },
  381: {
    name: "repeatableCadence",
    type: () => bikkieRepeatableCadence,
    help: "Cadence for repeating this quest.",
  },
  382: {
    name: "isMetaquest",
    type: () => bikkieTrue,
    help: "Whether this is a metaquest or not.",
  },
  383: {
    name: "metaquestPoints",
    type: () => bikkieMetaquestPoints,
    help: "Points to add to a metaquest when this quest is completed.",
  },
  384: {
    name: "vox",
    type: () => typedBinaryAttribute("vox"),
    help: "Vox file for this item",
  },
  385: {
    name: "attachmentTransform",
    type: () => bikkieTransform,
    help: "Affine transform to use for this item as an attachment",
  },
  386: {
    name: "iconSettings",
    type: () => bikkieIconSettings,
    help: "Settings for the icon",
  },
  387: {
    name: "paletteColor",
    type: () => bikkiePaletteColor,
    help: "Palette color for this item",
  },
  388: {
    name: "questCategory",
    type: () => bikkieQuestCategory,
    help: "Category for this quest. Impacts the marker icon.",
  },
  389: {
    name: "placementType",
    type: () => bikkiePlacementType,
    help: "How to place this item",
  },
  390: {
    name: "robotUpkeepFactor",
    type: () => bikkieNumber,
    help: "Factor of how much to multiply the robot's upkeep by, e.g. 0.75",
  },
  391: {
    name: "negatesBuffs",
    type: () => bikkieBuffs,
    help: "Which buffs this buff negates.",
  },
  392: {
    name: "isRobot",
    type: () => bikkieTrue,
    help: "Whether this item is a robot.",
  },
  393: {
    name: "isAdminEntity",
    type: () => bikkieTrue,
    help: "Whether this item creates an admin entity when placed.",
  },
  // 394: Deprecated,
  395: {
    name: "metaquest",
    type: () => bikkieBiscuitId("/metaquests"),
    help: "Metaquest associated with this biscuit.",
  },
  396: {
    name: "compatibleMinigames",
    type: () => bikkieCompatibleMinigames,
    help: "Minigames that are compatible with this item.",
  },
  397: {
    name: "givesHealth",
    type: () => bikkieNumber,
    help: "How much health to give in a consumable.",
  },
  398: {
    name: "mesh",
    type: () => typedBinaryAttribute("itemMesh"),
    help: "Mesh data for the item (evaluate 'kind' for format)",
    defaultToInferenceRule: "itemMesh",
  },
  399: {
    name: "icon",
    type: () => typedBinaryAttribute("png"),
    help: "Icon for this item",
    defaultToInferenceRule: "renderIcon",
  },
  400: {
    name: "transform",
    type: () => bikkieTransform,
    help: "Affine transform to use for this item in the world",
  },
  401: {
    name: "treasureChestDrop",
    type: () => bikkieDropTable,
    help: "What this treasure chest drops",
  },
  402: {
    name: "isCheckpoint",
    type: () => bikkieTrue,
  },
  403: {
    name: "animations",
    type: () => zAnimationInfo,
    help: "Animation info for the Biscuit",
  },
  404: {
    name: "isMount",
    type: () => bikkieTrue,
  },
  405: {
    name: "compatibleItemPredicates",
    type: () => bikkiePredicateSet,
  },
  406: {
    name: "mountScale",
    type: () => bikkieNumber,
  },
  407: {
    name: "worldMesh",
    type: () => typedBinaryAttribute("gltf"),
    help: "Mesh data for the item when placed in the world",
    defaultToInferenceRule: "placeableMesh",
  },
  408: {
    name: "defaultAnimationLoop",
    type: () => bikkieString,
    help: "Default animation to loop forever",
  },

  410: {
    name: "buildingRequirements",
    type: () => bikkieBuildingRequirements,
  },
  411: {
    name: "isRobotModule",
    type: () => bikkieTrue,
  },
  412: {
    name: "batteryCapacity",
    type: () => bikkieNumber,
    help: "Battery capacity in seconds",
  },
  413: {
    name: "readable",
    niceName: "Readable",
    type: () => bikkieReadable,
  },
  414: {
    name: "punchthroughSize",
    type: () => bikkieBoxSize,
    help: "XYZ size of a punchsize box, in voxels.",
  },
  415: {
    name: "punchthroughPosition",
    type: () => bikkieBoxSize,
    help: "XYZ position of CSS3D punchthrough",
  },
  416: {
    name: "isCSS3DElement",
    type: () => bikkieTrue,
  },
  417: {
    name: "textSignConfiguration",
    type: () => bikkieTextSignConfiguration,
    help: "Configure Text Sign",
  },
  418: {
    name: "isCustomizableTextSign",
    type: () => bikkieTrue,
  },
  419: {
    name: "cameraModes",
    type: () => bikkieCameraModes,
  },
  420: {
    name: "batteryCharge",
    type: () => bikkieNumber,
    help: "Charge of a battery in seconds.",
  },
  421: {
    name: "maxCountPerPlayer",
    type: () => bikkieNumber,
    help: "Max number of a placeable in world, per player.",
  },
  422: {
    name: "collidableSize",
    type: () => bikkieBoxSize,
    help: "XYZ size of the collidable, if different from boxSize.",
  },
  423: {
    name: "irradiance",
    type: () => bikkieLight,
    help: "Irradiance of an entity.",
  },
  424: {
    name: "hideProtectionArea",
    type: () => bikkieTrue,
  },
  425: {
    name: "cameraAction",
    type: () => bikkieString,
  },
  426: {
    name: "isBoombox",
    type: () => bikkieTrue,
  },
  427: {
    name: "unmuck",
    type: () => bikkieUnmuck,
    help: "Volume over which the placed item clears muck.",
  },
  428: {
    name: "voxWithHatVariant",
    type: () => typedBinaryAttribute("vox"),
    help: "Vox file for this item when there is a hat worn",
  },
  429: {
    name: "userPlacedDrop",
    type: () => bikkieDropTable,
    help: "What this block drops if it was placed by a user. If this attribute is missing, the block will always drop the associated block item.",
  },
  430: {
    name: "isTv",
    type: () => bikkieTrue,
  },
  431: {
    name: "voice",
    type: () => bikkieString,
    help: "The voice to use for the NPC",
  },
  432: {
    name: "npcNameGenerator",
    type: () => bikkieNpcNameGenerator,
    help: "A method for giving an NPC a name.",
  },
  433: {
    name: "npcAppearanceGenerator",
    type: () => bikkieNpcAppearanceGenerator,
    help: "A set of methods for determining the look of an NPC.",
  },
  434: {
    name: "isMailbox",
    type: () => bikkieTrue,
  },
  435: {
    name: "createdBy",
    type: () => bikkieEntityId,
  },
  436: {
    name: "isDoubleSided",
    type: () => bikkieTrue,
    help: "Whether the mesh should be rendered double sided.",
  },
  437: {
    name: "wrappedItemBag",
    type: () => bikkieString,
  },
  438: {
    name: "shaper",
    type: () => bikkieShaper,
  },
  439: {
    name: "isOutfit",
    type: () => bikkieTrue,
  },
  440: {
    name: "isOutfitStand",
    type: () => bikkieTrue,
  },
} as const);

// For now enforce all Attribute IDs are not in ECS space.
ok(
  values(attribs).every((a) => !("id" in a) || a.id > 200),
  "Attribute IDs and ECS component IDs must not overlap"
);

export interface Biscuit extends AbstractBiscuit {
  // For internal/admin use only really.
  readonly name: string;

  // Attributes follow
  readonly stackable?: bigint;
  readonly isDroppable?: true;
  readonly displayName: string;
  readonly displayDescription?: string;
  readonly displayTooltip?: string;
  readonly craftWith?: BiomesId[];
  readonly craftingDurationMs?: number;
  readonly galoisPath?: string;
  readonly craftingCategory: string;
  readonly galoisIcon?: string;
  readonly action?: string;
  readonly deletesOnDrop?: true;
  readonly entityId?: BiomesId;
  readonly chargesAt?: number;
  readonly chargeTime?: number;
  readonly extraCharge?: number;
  readonly dischargesAt?: number;
  readonly tooltipTypeName?: string;
  readonly output?: BagSpec;
  readonly input?: BagSpec;
  readonly meshGaloisPath?: string;
  readonly groupId?: BiomesId;
  readonly rotation?: number;
  readonly seedDrop?: DropTable;
  readonly hardnessClass: number;
  readonly dyedWith?: BiomesId;
  readonly dyeColor?: string;
  readonly terrainName?: string;
  readonly preferredDestroyerClass?: number;
  readonly deedId?: BiomesId;
  readonly turnsInto?: BiomesId;
  readonly drop?: DropTable;
  readonly numSlots?: number;
  readonly numCols?: number;
  readonly fishLength?: number;
  readonly preferredDrop?: DropTable;
  readonly destroyerClass?: number;
  readonly dps?: number;
  readonly lifetimeDurabilityMs?: number;
  readonly shape?: ShapeName;
  readonly shaper?: ShaperName;
  readonly buffs?: BuffsAndProbabilities;
  readonly isCurrency?: true;
  readonly wearAsHat?: true;
  readonly wearAsOuterwear?: true;
  readonly wearAsTop?: true;
  readonly wearAsBottoms?: true;
  readonly wearOnFeet?: true;
  readonly wearAsHair?: true;
  readonly wearOnFace?: true;
  readonly wearOnEars?: true;
  readonly wearOnNeck?: true;
  readonly wearOnHands?: true;
  readonly isCraftingStation: true;
  readonly isFish?: true;
  readonly isBlock?: true;
  readonly isHead?: true;
  readonly isTool?: true;
  readonly isWearable?: true;
  readonly duration?: number;
  readonly data?: string;
  readonly buffType?: BuffType;
  readonly minigameId?: BiomesId;
  readonly isBurnable?: true;
  readonly isRecipe?: true;
  readonly isBlueprint?: true;
  readonly isPlaceable?: true;
  readonly isBuild?: true;
  readonly isContainer?: true;
  readonly isDoor?: true;
  readonly isFrame?: true;
  readonly isShopContainer?: true;
  readonly isSeed?: true;
  readonly isConsumable?: true;
  readonly isLog?: true;
  readonly isLumber?: true;
  readonly isAnyStone?: true;
  readonly isPickaxe?: true;
  readonly isAxe?: true;
  readonly breakVerb?: string;
  readonly typeOnLeaderboard?: string;
  readonly isBait?: true;
  readonly description?: string;
  readonly rewards?: BagSpec;
  readonly navigationAid?: NavigationAid;
  readonly unlock?: StoredTriggerDefinition;
  readonly particleIcon?: string;
  readonly boxSize?: Vec3;
  readonly maxCount?: number;
  readonly rotateSpeed?: number;
  readonly walkSpeed?: number;
  readonly runSpeed?: number;
  readonly ttl?: number;
  readonly effectsProfile?: BiomesId;
  readonly behavior?: Behavior;
  readonly npcBag?: BagSpec;
  readonly spawnConstraints?: SpawnConstraints;
  readonly enabled?: boolean;
  readonly density?: number;
  readonly playerModifiers?: PlayerModifiers;
  readonly npcDefaultDialog?: string;
  readonly stationSupportsHandcraft: boolean;
  readonly sounds?: NpcEffectProfile;
  readonly npcGlobals?: NpcGlobals;
  readonly trigger?: StoredTriggerDefinition;
  readonly questGiver?: BiomesId;
  readonly isSideQuest?: true;
  readonly isQuestGiver?: true;
  readonly plantableBlocks?: BiomesId[];
  readonly isQuest?: true;
  readonly triggerIcon?: TriggerIcon;
  readonly isBlessed?: true;
  readonly questAcceptText?: string;
  readonly questDeclineText?: string;
  readonly acceptsBait?: true;
  readonly catchBarSize?: number;
  readonly damageOnContact?: DamageOnContact;
  readonly facialHair?: true;
  readonly surfaceSlip?: SurfaceSlip;
  readonly waterAmount: number;
  readonly abstract?: true;
  readonly deprecated?: true;
  readonly isPlayerLikeAppearance?: true;
  readonly isTemplate?: true;
  readonly itemSellPrice?: number;
  readonly isTillable?: true;
  readonly farming?: FarmSpec;
  readonly minDestructionTimeMs?: number;
  readonly isMediaPlayer?: true;
  readonly isUncollideable?: true;
  readonly fertilizerEffect?: FertilizerEffect;
  readonly collectionDisplayItem?: BiomesId;
  readonly isHidden?: true;
  readonly craftingStationType?: CraftingStationType;
  readonly isCompostable?: true;
  readonly isFruit?: true;
  readonly isVegetable?: true;
  readonly collectionCategory?: BiomesId;
  readonly isCollectionCategory?: true;
  readonly isDefault?: true;
  readonly isEnduring?: true;
  readonly isCollidable?: true;
  readonly isDyeable?: true;
  readonly lifetime?: number;
  readonly isEmissive?: true;
  readonly isPet?: true;
  readonly unmuck?: BikkieUnmuck;
  readonly fishLengthDistribution?: FishLengthDistribution;
  readonly fishMinigameAdjustments?: FishMinigameAdjustments;
  readonly isMuckwaterFish?: true;
  readonly isClearwaterFish?: true;
  readonly projectsProtection?: ProtectionProjection;
  readonly turnsIntoRotation?: number;
  readonly customInspectText?: string;
  readonly requiresWand?: true;
  readonly interactPattern?: AABB;
  readonly isChargeable?: true;
  readonly isDischargeable?: true;
  readonly isRepeatable?: true;
  readonly muckDrop?: DropTable;
  readonly muckPreferredDrop?: DropTable;
  readonly fishConditions?: FishCondition[];
  readonly repeatableCadence?: RepeatableCadence;
  readonly isMetaquest?: true;
  readonly metaquestPoints?: MetaquestPoints[];
  readonly vox?: AnyBinaryAttribute;
  readonly attachmentTransform?: AffineTransform;
  readonly iconSettings?: IconSettings;
  readonly paletteColor?: string;
  readonly questCategory?: QuestCategory;
  readonly placementType?: PlacementType;
  readonly robotUpkeepFactor?: number;
  readonly negatesBuffs?: Buffs;
  readonly isRobot?: true;
  readonly isAdminEntity?: true;
  readonly metaquest?: BiomesId;
  readonly compatibleMinigames?: CompatibleMinigames;
  readonly givesHealth?: number;
  readonly mesh?: AnyBinaryAttribute;
  readonly icon?: AnyBinaryAttribute;
  readonly transform?: AffineTransform;
  readonly treasureChestDrop?: DropTable;
  readonly isCheckpoint?: true;
  readonly animations?: AnimationInfo;
  readonly isMount?: true;
  readonly compatibleItemPredicates?: Set<BiomesId>;
  readonly mountScale?: number;
  readonly worldMesh?: AnyBinaryAttribute;
  readonly defaultAnimationLoop?: string;
  readonly readable?: Readable;
  readonly buildingRequirements: BuildingRequirements;
  readonly isRobotModule?: true;
  readonly batteryCapacity?: number;
  readonly punchthroughSize?: Vec3;
  readonly punchthroughPosition?: Vec3;
  readonly isCSS3DElement?: true;
  readonly textSignConfiguration?: TextSignConfiguration;
  readonly isCustomizableTextSign?: true;
  readonly cameraModes?: CameraItemMode[];
  readonly batteryCharge?: number;
  readonly maxCountPerPlayer?: number;
  readonly collidableSize?: Vec3;
  readonly irradiance?: Light;
  readonly hideProtectionArea?: boolean;
  readonly cameraAction?: string;
  readonly isBoombox?: true;
  readonly voxWithHatVariant?: AnyBinaryAttribute;
  readonly userPlacedDrop: DropTable;
  readonly isTv?: true;
  readonly voice?: string;
  readonly npcNameGenerator?: NameGenerator;
  readonly npcAppearanceGenerator?: NpcAppearanceGenerator;
  readonly isMailbox?: true;
  readonly createdBy: BiomesId;
  readonly isDoubleSided?: true;
  readonly wrappedItemBag?: string;
  readonly isOutfit?: true;
  readonly isOutfitStand?: true;
}

export const PUBLISHED_BINARY_ATTRIBUTES: ReadonlyArray<
  keyof Biscuit & keyof typeof attribs
> = ["mesh", "worldMesh", "icon"] as const;

// Check that the Biscuit interface is correct.
// Produce partials with the fallback attributes and general attributes.
type FallbackBiscuit = SelectFallbackAttributes<typeof attribs>;
type ConcreteBiscuit = BiscuitFromAttributeSelection<typeof attribs>;

// Merge the fallback attributes in (they're non-optional) and add 'name'
type BiscuitExpectedFields = Omit<ConcreteBiscuit, keyof FallbackBiscuit> &
  FallbackBiscuit & { readonly name: string };

// For ease of use we don't distinguish undefined from absent, reverse that
// here so the comparison is correct.
type MakeOptionalFieldsUndefined = {
  [K in keyof Biscuit]-?: Biscuit extends Record<K, Biscuit[K]>
    ? Biscuit[K]
    : undefined;
};

const _checkInterfaceIsCorrect =
  0 as unknown as MakeOptionalFieldsUndefined satisfies BiscuitExpectedFields;

export const zBiscuit = z.lazy(
  memoize(
    () =>
      z.object({
        id: zBiomesId,
        name: z.string().optional(),
        ...(Object.fromEntries(
          compactMap(attribs.all, (attrib) =>
            "type" in attrib
              ? [attrib.name, attrib.type().optional()]
              : undefined
          )
        ) as Record<string, ZodType<unknown>>),
      }) as unknown as ZodType<Biscuit>
  )
);

export function biscuitToJson(biscuit: Biscuit, includeBinary = false) {
  const visitAttribute = (attribute: unknown): unknown => {
    if (attribute && typeof attribute === "object") {
      if (attribute instanceof Array) {
        return attribute.map((val) => visitAttribute(val));
      } else if (attribute instanceof Set) {
        return visitAttribute([...attribute]);
      } else if (attribute instanceof Map) {
        return visitAttribute([...attribute.entries()]);
      } else if (isBinaryData(attribute)) {
        if (includeBinary) {
          return Buffer.from(attribute).toString("base64");
        } else {
          return "<omitted>";
        }
      } else {
        return visitAttribute([...Object.entries(attribute)]);
      }
    } else if (typeof attribute === "bigint") {
      return attribute.toString();
    } else if (["string", "number", "boolean"].includes(typeof attribute)) {
      return attribute;
    }
  };

  return {
    id: biscuit.id,
    name: biscuit.name,
    ...Object.fromEntries(
      compactMap(Object.entries(biscuit), ([key, val]) => {
        if (attribs.byName.has(key)) {
          return [key, visitAttribute(val)];
        }
      })
    ),
  };
}
