import color_palettes from "@/shared/asset_defs/gen/color_palettes.json";

type Color = [number, number, number];

export interface ColorEntry {
  id: string;
  iconColor: Color;
  colors: Color[];
}

export const paletteEntries = color_palettes;

export type PaletteKey = keyof typeof paletteEntries;

export type PaletteOption<K extends PaletteKey> =
  keyof (typeof paletteEntries)[K];

export function colorEntries(p: PaletteKey): ColorEntry[] {
  return Array.from(Object.entries(paletteEntries[p])).map(([k, v]) => ({
    id: k,
    iconColor: v.iconColor as Color,
    colors: v.colors.map((x) => x as Color),
  }));
}

export function isPaletteOption<P extends PaletteKey>(
  paletteId: P,
  po: string | any // Hack to appease TypeScript, we shouldn't need `| any`.
): po is PaletteOption<P> {
  return (
    typeof po === "string" &&
    Array.from(Object.keys(paletteEntries[paletteId])).includes(po)
  );
}
