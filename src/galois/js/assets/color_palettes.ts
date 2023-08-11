import * as l from "@/galois/lang";

export interface PaletteDef {
  paletteEntries: readonly string[];
}

export const colorPaletteDefs = {
  "color_palettes/eye_colors": {
    // Where to replace this palette on an item/wearable.
    // See https://www.notion.so/illinc/Item-Reserved-Palette-Entries-2b456a9e0b5740a68a12e2fd479db1a0
    itemReplaceStart: 249,
    // The number of colors in each palette entry.
    numColors: 7,
    paletteEntries: [
      "eye_color_0",
      "eye_color_1",
      "eye_color_2",
      "eye_color_3",
      "eye_color_4",
      "eye_color_5",
      "eye_color_6",
      "eye_color_7",
      "eye_color_8",
      "eye_color_9",
      "eye_color_10",
      "eye_color_11",
      "eye_color_12",
      "eye_color_13",
      "eye_color_14",
      "eye_color_15",
      "eye_color_16",
      "eye_color_17",
    ],
  },
  "color_palettes/hair_colors": {
    itemReplaceStart: 233,
    numColors: 8,
    paletteEntries: [
      "hair_color_0",
      "hair_color_1",
      "hair_color_2",
      "hair_color_3",
      "hair_color_4",
      "hair_color_5",
      "hair_color_6",
      "hair_color_7",
      "hair_color_8",
      "hair_color_9",
      "hair_color_10",
      "hair_color_11",
      "hair_color_12",
      "hair_color_13",
      "hair_color_14",
      "hair_color_15",
      "hair_color_16",
      "hair_color_17",
    ],
  },
  "color_palettes/item_materials": {
    itemReplaceStart: 217,
    numColors: 8,
    paletteEntries: ["wood", "stone", "silver", "gold", "diamond", "neptunium"],
  },
  "color_palettes/skin_colors": {
    itemReplaceStart: 241,
    numColors: 8,
    paletteEntries: [
      "skin_color_0",
      "skin_color_1",
      "skin_color_2",
      "skin_color_3",
      "skin_color_4",
      "skin_color_5",
      "skin_color_6",
      "skin_color_7",
      "skin_color_8",
      "skin_color_9",
      "skin_color_10",
      "skin_color_11",
      "skin_color_12",
      "skin_color_13",
      "skin_color_14",
      "skin_color_15",
      "skin_color_16",
      "skin_color_17",
    ],
  },
  "color_palettes/item_primary_colors": {
    itemReplaceStart: 9,
    numColors: 24,
    paletteEntries: [
      "blue",
      "red",
      "green",
      "orange",
      "white",
      "purple",
      "pink",
      "yellow",
      "black",
      "tan",
      "brown",
      "silver",
      "cyan",
      "magenta",
      "brightgreen",
      "brightred",
      "brightpurple",
      "brightpink",
      "brightyellow",
      "brightblue",
      "brightorange",
      "lightblue",
    ],
  },
} as const;

function getPaletteAsset(path: string, paletteEntry: PaletteDef) {
  return l.LoadColorPaletteListFromJSONFile(
    paletteEntry.paletteEntries,
    `${path}.json`
  );
}

export type PaletteKey = keyof typeof colorPaletteDefs;

export type PaletteOption<K extends PaletteKey> =
  (typeof colorPaletteDefs)[K]["paletteEntries"][number];
export function isPaletteOption<P extends PaletteKey>(
  paletteId: P,
  po: string
): po is PaletteOption<P>;
export function isPaletteOption(
  paletteId: string,
  po: string
): paletteId is PaletteKey;
export function isPaletteOption<P extends PaletteKey>(
  paletteId: P,
  po: string
): po is PaletteOption<P> {
  return !!colorPalettesMap.get(paletteId)?.def.paletteEntries.includes(po);
}

const colorPalettesEntries = Object.entries(colorPaletteDefs).map(
  ([k, v]) =>
    [k, { def: v as PaletteDef, asset: getPaletteAsset(k, v) }] as const
);
export const colorPalettesMap = new Map(colorPalettesEntries);

export interface ColorDescriptor<P extends PaletteKey = PaletteKey> {
  paletteId: P;
  colorId: PaletteOption<P>;
}
export function makeColorDescriptor<P extends PaletteKey>(
  paletteId: P,
  colorId: PaletteOption<P>
): ColorDescriptor<P> {
  return {
    paletteId,
    colorId,
  };
}

export function getColorEntry<P extends PaletteKey>(desc: ColorDescriptor<P>) {
  return l.GetColorEntry(
    desc.colorId,
    colorPalettesMap.get(desc.paletteId)!.asset
  );
}

export function paletteReplaceRange<P extends PaletteKey>(
  paletteKey: P
): [number, number] {
  const paletteDef = colorPaletteDefs[paletteKey];
  const start = paletteDef.itemReplaceStart;
  return [start, start + paletteDef.numColors];
}

export function getAssets(): Record<string, l.Asset> {
  return {
    ...Object.fromEntries(
      colorPalettesEntries.map(([k, { asset }]) => [k, asset])
    ),
    "definitions/color_palettes": l.ColorPalettesDefinitions(
      colorPalettesEntries.map(([k, v]) => [k, v.asset])
    ),
  };
}
