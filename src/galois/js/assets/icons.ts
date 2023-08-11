import { blockDefs } from "@/galois/assets/blocks";
import { floraDefs } from "@/galois/assets/florae";
import { glassDefs } from "@/galois/assets/glass";
import { voxFromProperty } from "@/galois/assets/item_meshes";
import type { NpcEntry } from "@/galois/assets/npcs";
import { npcsList, voxForNpc } from "@/galois/assets/npcs";
import type { PlaceableEntry } from "@/galois/assets/placeables";
import {
  placeablePropertiesByName,
  placeablesList,
} from "@/galois/assets/placeables";
import { posedVoxJointMapFromWearableParams } from "@/galois/assets/wearables";
import * as l from "@/galois/lang";

export const axe = l.ToPNG(l.ImageRGBA("icons/axe.png"));
export const camera = l.ToPNG(l.ImageRGBA("icons/camera.png"));
export const oakTrunk = l.ToPNG(l.ImageRGBA("icons/oak-trunk.png"));
export const pickaxe = l.ToPNG(l.ImageRGBA("icons/pickaxe.png"));
export const stone = l.ToPNG(l.ImageRGBA("icons/stone.png"));
export const wand = l.ToPNG(l.ImageRGBA("icons/wand.png"));
export const woodChest = l.ToPNG(l.ImageRGBA("icons/wood-chest.png"));

// Buffs
export const sluggish = l.ToPNG(l.ImageRGBA("icons/buffs/debuff-sluggish.png"));
export const drinkBounce = l.ToPNG(l.ImageRGBA("icons/buffs/drink-bounce.png"));
export const drinkFizzy = l.ToPNG(l.ImageRGBA("icons/buffs/drink-fizzy.png"));
export const drinkZippy = l.ToPNG(l.ImageRGBA("icons/buffs/drink-zippy.png"));
export const drinkPeaceful = l.ToPNG(
  l.ImageRGBA("icons/buffs/drink-peaceful.png")
);
export const foodBreatheUnderwater = l.ToPNG(
  l.ImageRGBA("icons/buffs/food-breathe-underwater.png")
);
export const foodFeelGood = l.ToPNG(
  l.ImageRGBA("icons/buffs/food-feel-good.png")
);
export const foodLongDistance = l.ToPNG(
  l.ImageRGBA("icons/buffs/food-long-distance.png")
);
export const foodLookingGood = l.ToPNG(
  l.ImageRGBA("icons/buffs/food-looking-good.png")
);
export const foodNightVision = l.ToPNG(
  l.ImageRGBA("icons/buffs/food-night-vision.png")
);
export const keyBlue = l.ToPNG(l.ImageRGBA("icons/buffs/key-blue.png"));
export const keyRed = l.ToPNG(l.ImageRGBA("icons/buffs/key-red.png"));

// Particles
export const bubble = l.ToPNG(l.ImageRGBA("icons/particles/bubble_16px.png"));
export const lightning = l.ToPNG(
  l.ImageRGBA("icons/particles/lightning_bolt_16px.png")
);
export const peace = l.ToPNG(
  l.ImageRGBA("icons/particles/peace_sign_16px.png")
);

// Generate the list of block icons.
export const blockIcons: Record<string, l.PNG> = {};
for (const [name, block] of Object.entries(blockDefs)) {
  blockIcons[`icons/blocks/${name}`] = l.ToPNG(
    l.AdjustContrast(l.AdjustBrightness(l.ToIcon(block), 0.9), 1.3)
  );
}

// Generate the list of flora icons.
export const floraIcons: Record<string, l.PNG> = {};
for (const [name, flora] of Object.entries(floraDefs)) {
  floraIcons[`icons/florae/${name}`] = l.ToPNG(
    l.AdjustContrast(l.AdjustBrightness(l.ToIcon(flora), 0.9), 1.3)
  );
}

// Generate the list of glass icons.
export const glassIcons: Record<string, l.PNG> = {};
for (const [name, glass] of Object.entries(glassDefs)) {
  glassIcons[`icons/glass/${name}`] = l.ToPNG(
    l.AdjustContrast(l.AdjustBrightness(l.ToIcon(glass), 0.9), 1.3)
  );
}

function iconFromVoxMap(
  voxMap: l.GeneralNode<"VoxMap">,
  cameraDir: [number, number, number],
  lightingDir: [number, number, number]
) {
  let texture = l.RenderVoxMap(voxMap, [256, 256], cameraDir, lightingDir);

  texture = l.AdjustBrightness(texture, 1.4);
  texture = l.AdjustContrast(texture, 1.0);
  texture = l.AdjustSaturation(texture, 1.2);

  return l.ToPNG(texture);
}

function npcIcon(npcEntry: NpcEntry) {
  const voxMap = (() => {
    switch (npcEntry.assembly.kind) {
      case "skeleton":
        return l.ToVoxMap(voxForNpc(npcEntry));
      case "player":
        return l.FlattenPosedVoxJointMap(
          posedVoxJointMapFromWearableParams(npcEntry.assembly.wearableParams)
        );
    }
  })();

  return iconFromVoxMap(voxMap, [-1, 1, -1], [-7, 5, -11]);
}

export const npcIcons: Record<string, l.PNG> = Object.fromEntries(
  npcsList.map((x) => [`icons/npcs/${x.name}`, npcIcon(x)])
);

function placeableIcon(placeable: PlaceableEntry) {
  const voxProperties = placeablePropertiesByName.get(placeable.name)!;
  return l.ToPNG(
    l.RenderVoxMap(
      l.ToVoxMap(voxFromProperty(voxProperties)),
      [256, 256],
      voxProperties.iconSettings
    )
  );
}

export const placeablesIcons: Record<string, l.PNG> = Object.fromEntries(
  placeablesList.map((x) => [`icons/placeables/${x.name}`, placeableIcon(x)])
);

export function getAssets(): Record<string, l.Asset> {
  return {
    "icons/axe": axe,
    "icons/camera": camera,
    "icons/oak_trunk": oakTrunk,
    "icons/pickaxe": pickaxe,
    "icons/stone": stone,
    "icons/wand": wand,
    "icons/wood_chest": woodChest,
    "icons/buffs/sluggish": sluggish,
    "icons/buffs/drink_bounce": drinkBounce,
    "icons/buffs/drink_fizzy": drinkFizzy,
    "icons/buffs/drink_zippy": drinkZippy,
    "icons/buffs/drink_peaceful": drinkPeaceful,
    "icons/buffs/food_breathe_underwater": foodBreatheUnderwater,
    "icons/buffs/food_feel_good": foodFeelGood,
    "icons/buffs/food_long_distance": foodLongDistance,
    "icons/buffs/food_looking_good": foodLookingGood,
    "icons/buffs/food_night_vision": foodNightVision,
    "icons/buffs/key_blue": keyBlue,
    "icons/buffs/key_red": keyRed,
    "icons/particles/bubble": bubble,
    "icons/particles/lightning": lightning,
    "icons/particles/peace": peace,
    ...blockIcons,
    ...floraIcons,
    ...glassIcons,
    ...npcIcons,
    ...placeablesIcons,
  };
}
