// This file is referenced on the Galois side and acts as the source of truth
// for all wearables definitions. During export, the contents of this file
// are reproduced into a biomes-accessible generated wearables_list.ts file.
// The reason why we keep these separate is that it allows us the ability
// to have artist-specified content in the output generated wearables_list.ts,
// instead of the static definitions found here today.

import type { PaletteOption } from "@/shared/asset_defs/color_palettes";
import type { CharacterWearableSlot } from "@/shared/asset_defs/wearables_list";

export interface CharacterWearable {
  name: string;
  slot: CharacterWearableSlot;
  // Should an icon not be generated for this wearable?
  // Ususally set to false for wearables that are art-only and not visible to
  // ECS.
  noIcon?: boolean;
  palette?: PaletteOption<"color_palettes/item_materials">;
  // For paletted items, refers to the base item that this was derived from.
  baseName?: string;
}
