import type { SchemaPathsOf } from "@/shared/bikkie/core";
import { Bikkie } from "@/shared/bikkie/core";
import type { attribs } from "@/shared/bikkie/schema/attributes";

declare global {
  var __bikkieSchema: Bikkie<any, any>; // eslint-disable-line no-var
}

function createBikkie() {
  return new Bikkie({
    blocks: {
      attributes: ["isBlock", "displayName", "galoisPath"],
      recommendedAttributes: ["drop", "seedDrop"],
    },
    head: {
      attributes: ["isHead"],
    },
    items: {
      attributes: ["displayName", "craftingCategory", "stackable"],
      subschemas: {
        fish: {
          attributes: ["isFish"],
        },
        craftingStation: {
          attributes: ["isCraftingStation"],
          recommendedAttributes: [
            "stationSupportsHandcraft",
            "buildingRequirements",
          ],
        },
        placeables: {
          attributes: ["isPlaceable"],
          recommendedAttributes: ["maxCountPerPlayer"],
        },
        tools: {
          attributes: ["isTool"],
        },
        wearables: {
          attributes: ["isWearable"],
          subschemas: {
            hat: {
              attributes: ["wearAsHat"],
            },
            outerwear: {
              attributes: ["wearAsOuterwear"],
            },
            top: {
              attributes: ["wearAsTop"],
            },
            bottoms: {
              attributes: ["wearAsBottoms"],
            },
            feet: {
              attributes: ["wearOnFeet"],
            },
            hair: {
              attributes: ["wearAsHair"],
            },
            face: {
              attributes: ["wearOnFace"],
            },
            ears: {
              attributes: ["wearOnEars"],
            },
            neck: {
              attributes: ["wearOnNeck"],
            },
            hands: {
              attributes: ["wearOnHands"],
            },
          },
        },
        blueprints: {
          attributes: ["isBlueprint"],
        },
        consumables: {
          attributes: ["isConsumable"],
        },
        blessed: {
          attributes: ["isBlessed"],
        },
        seed: {
          attributes: ["isSeed"],
        },
      },
    },
    buffs: {
      attributes: ["buffType"],
    },
    npcs: {
      subschemas: {
        types: {
          attributes: [
            "displayName",
            "boxSize",
            "rotateSpeed",
            "walkSpeed",
            "runSpeed",
            "behavior",
          ],
          recommendedAttributes: [
            "galoisPath",
            "drop",
            "maxCount",
            "effectsProfile",
            "ttl",
            "playerLikeAppearance",
          ],
        },
        spawnEvents: {
          attributes: ["npcBag", "spawnConstraints", "density", "enabled"],
        },
        effectsProfiles: {
          attributes: ["sounds"],
        },
        globals: {
          attributes: ["npcGlobals"],
        },
      },
    },
    recipes: {
      attributes: [
        "input",
        "output",
        "craftWith",
        "craftingDurationMs",
        "isRecipe",
      ],
    },
    questGivers: {
      attributes: ["isQuestGiver"],
    },
    quests: {
      attributes: ["isQuest", "displayName"],
      recommendedAttributes: [
        "description",
        "navigationAid",
        "isSideQuest",
        "questGiver",
        "questAcceptText",
        "questDeclineText",
        "unlock",
        "trigger",
        "triggerIcon",
        "repeatableCadence",
        "questCategory",
      ],
    },
    collectionCategories: {
      attributes: ["displayName", "isCollectionCategory"],
      recommendedAttributes: ["description", "isHidden"],
    },
    dyes: {
      attributes: ["dyeColor"],
    },
    metaquests: {
      attributes: ["displayName", "isMetaquest", "enabled"],
    },
  });
}

export type RemappedSchema<T> = T extends Bikkie<any, infer TRaw>
  ? Bikkie<typeof attribs, TRaw>
  : never;

export type BikkieSchema = RemappedSchema<ReturnType<typeof createBikkie>>;

export const bikkie: BikkieSchema = (() => {
  return (global.__bikkieSchema ??= createBikkie());
})();

export type SchemaPath = SchemaPathsOf<typeof bikkie>;
