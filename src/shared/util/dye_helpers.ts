import type { PaletteOption } from "@/shared/asset_defs/color_palettes";
import { isPaletteOption } from "@/shared/asset_defs/color_palettes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { AnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import type { Item } from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";

export type DyeColor = PaletteOption<"color_palettes/item_primary_colors">;

export function isValidDyeColor(str: string): str is DyeColor {
  return isPaletteOption("color_palettes/item_primary_colors", str);
}

export function isDyeItem(item: Item): boolean {
  return isValidDyeColor(item.dyeColor ?? "");
}

export function paletteColorToDyeColor(str: string) {
  if (!str) {
    return;
  }
  const parts = str.split(":");
  if (parts.length === 2 && isValidDyeColor(parts[1])) {
    return parts[1];
  }
}

export function dyeColorToPaletteColor(color: DyeColor) {
  return `color_palettes/item_primary_colors:${color}`;
}

export function dyeColorForDyeItem(item: Item): DyeColor | undefined {
  const dyeColorString = item.dyeColor ?? "";
  return isValidDyeColor(dyeColorString) ? dyeColorString : undefined;
}

export function itemIsDyeable(item: Item): boolean {
  // Right now we only support dying wearables.
  return !!item.isWearable;
}

export function itemDyedWith(item: Item): Item | undefined {
  const dyedWith = item.dyedWith;
  return dyedWith ? anItem(dyedWith) : undefined;
}

export function itemDyedColor(item: Item): DyeColor | undefined {
  const dyedWith = itemDyedWith(item);
  if (dyedWith) {
    return dyeColorForDyeItem(dyedWith);
  }
  const dyeFromPalette = paletteColorToDyeColor(item.paletteColor ?? "");
  if (dyeFromPalette) {
    return dyeFromPalette;
  }
}

export function computeItemPaletteColor(item: Item): string | undefined {
  const dyeColor = itemDyedColor(item);
  if (dyeColor) {
    return dyeColorToPaletteColor(dyeColor);
  }
}

export function resolveBinaryAttribute(
  primary: AnyBinaryAttribute,
  item?: Item
): AnyBinaryAttribute {
  if (!primary.samples || !item) {
    return primary;
  }
  const paletteColor = computeItemPaletteColor(item);
  // TODO: Generalize sample lookup to find best-sample for current attributes.
  const sample = paletteColor
    ? primary.samples.find(
        ({ key }) => key[attribs.paletteColor.id] === paletteColor
      )
    : undefined;
  if (sample) {
    return sample.value;
  }
  return primary;
}
