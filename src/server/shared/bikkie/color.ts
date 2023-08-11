import type * as color_palettes from "@/galois/assets/color_palettes";
import { isPaletteOption } from "@/galois/assets/color_palettes";
import { log } from "@/shared/logging";

export function colorStringToDescriptor(color?: string) {
  if (!color) {
    return;
  }
  const parts = color.split(":");
  if (parts.length !== 2) {
    log.warn("Invalid color for Biscuit", { color });
    return;
  }
  const [paletteId, colorId] = parts;
  if (!isPaletteOption(paletteId, colorId)) {
    log.warn("Unknown palette option for Biscuit", { color });
    return;
  }
  return { paletteId, colorId } as color_palettes.ColorDescriptor;
}

export function colorDescriptorToString(
  descriptor: color_palettes.ColorDescriptor
) {
  return `${descriptor.paletteId}:${descriptor.colorId}`;
}
