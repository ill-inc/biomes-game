import type { PaletteOption } from "@/shared/asset_defs/color_palettes";
import { isPaletteOption } from "@/shared/asset_defs/color_palettes";
import type { CharacterWearableSlot } from "@/shared/asset_defs/wearables_list";
import { CharacterWearableSlotIds } from "@/shared/asset_defs/wearables_list";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { BiomesId } from "@/shared/ids";
import { safeParseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { mapMap } from "@/shared/util/collections";
import { dictToQueryString } from "@/shared/util/helpers";

// Bumping this number implies that all assets previously generated and
// saved/cached are now invalid.
export const ASSET_EXPORTS_SERVER_VERSION = 55;

const ASSET_EXPORT_VERSION_QUERY_KEY = "aev";

export type WearableClientDescriptor = {
  id: BiomesId;
  primaryColor?: PaletteOption<"color_palettes/item_primary_colors">;
  withHatVariant?: boolean;
};
export type SlotToWearableMap = Map<string, WearableClientDescriptor>;

const SKIN_COLOR_KEY = "sc";
const EYE_COLOR_KEY = "ec";
const HAIR_COLOR_KEY = "hc";

export type WearableAssignment = [
  BiomesId,
  BiomesId,
  PaletteOption<"color_palettes/item_primary_colors"> | undefined
][];

export function makePlayerMeshQueryString(
  wearables: WearableAssignment,
  skinColorId?: PaletteOption<"color_palettes/skin_colors">,
  eyeColorId?: PaletteOption<"color_palettes/eye_colors">,
  hairColorId?: PaletteOption<"color_palettes/hair_colors">
): string {
  const queryParams = wearables.map(([type, id, dye]) => [
    `${type}`,
    `${id}${dye ? `,${dye}` : ""}`,
  ]);

  // Include the asset server version in the URL requests as well.
  queryParams.push([
    ASSET_EXPORT_VERSION_QUERY_KEY,
    ASSET_EXPORTS_SERVER_VERSION.toString(),
  ]);

  if (skinColorId) {
    queryParams.push([SKIN_COLOR_KEY, skinColorId]);
  }
  if (eyeColorId) {
    queryParams.push([EYE_COLOR_KEY, eyeColorId]);
  }
  if (hairColorId) {
    queryParams.push([HAIR_COLOR_KEY, hairColorId]);
  }

  return dictToQueryString(Object.fromEntries(queryParams), true);
}

export function makePlayerMeshUrl(
  wearables: WearableAssignment,
  skinColorId?: PaletteOption<"color_palettes/skin_colors">,
  eyeColorId?: PaletteOption<"color_palettes/eye_colors">,
  hairColorId?: PaletteOption<"color_palettes/hair_colors">
): string {
  return `/api/assets/player_mesh.glb${makePlayerMeshQueryString(
    wearables,
    skinColorId,
    eyeColorId,
    hairColorId
  )}`;
}

export function makePlayerMeshWarmupUrl(
  wearables: WearableAssignment,
  skinColorId?: PaletteOption<"color_palettes/skin_colors">,
  eyeColorId?: PaletteOption<"color_palettes/eye_colors">,
  hairColorId?: PaletteOption<"color_palettes/hair_colors">
): string {
  return `/api/assets/warm_player_mesh${makePlayerMeshQueryString(
    wearables,
    skinColorId,
    eyeColorId,
    hairColorId
  )}`;
}

export interface AssetVersionMismatchWarning {
  kind: "AssetVersionMismatch";
}
export type ParsePlayerMeshWarning = AssetVersionMismatchWarning;
export interface SlotToWearableMapResults {
  kind: "SlotToWearableMapResults";
  warning?: ParsePlayerMeshWarning;
  map: SlotToWearableMap;
  skinColorId?: PaletteOption<"color_palettes/skin_colors">;
  eyeColorId?: PaletteOption<"color_palettes/eye_colors">;
  hairColorId?: PaletteOption<"color_palettes/hair_colors">;
}
export interface UrlParseError {
  kind: "UrlParseError";
}
export type ParsePlayerMeshResults = SlotToWearableMapResults | UrlParseError;

export function parsePlayerMeshUrl(urlString: string): ParsePlayerMeshResults {
  // First parse the URL string.
  // Doesn't really matter what baseURL is, as long as it's well formed. It's
  // needed because otherwise the `URL()` constructor will throw an error.
  const baseURL = `http://a.com/'`;
  const url = new URL(urlString, baseURL);
  if (!url) {
    return { kind: "UrlParseError" };
  }

  // First check for the version key.
  const versionValue = url.searchParams.get(ASSET_EXPORT_VERSION_QUERY_KEY);
  if (!versionValue) {
    return { kind: "UrlParseError" };
  }

  const assetVersionMismatch =
    versionValue !== ASSET_EXPORTS_SERVER_VERSION.toString();
  if (assetVersionMismatch) {
    log.warn(
      `Asset version mismatch. Requested ${versionValue}, serving ${ASSET_EXPORTS_SERVER_VERSION.toString()}.`
    );
  }

  // Sanitize wearables
  const unknownWearablesDetected = false;
  const resultMap: SlotToWearableMap = new Map(
    CharacterWearableSlotIds.flatMap((galoisKey) => {
      const biscuitIdString = String(WEARABLE_SLOT_TO_BIKKIE_ID.get(galoisKey));
      if (!biscuitIdString) {
        return [];
      }
      const valueString = url.searchParams.get(biscuitIdString);
      if (!valueString) {
        return [];
      }
      const splitValue = valueString.split(",");
      if (splitValue.length === 0) {
        return [];
      }
      const biscuitId = safeParseBiomesId(splitValue[0]);
      if (biscuitId === undefined) {
        return [];
      }
      let valueDye:
        | PaletteOption<"color_palettes/item_primary_colors">
        | undefined = undefined;
      if (splitValue.length >= 2) {
        valueDye = parseDyeType(splitValue[1]);
        if (valueDye === undefined) {
          return [];
        }
      }
      return [
        [
          galoisKey,
          {
            id: biscuitId,
            primaryColor: valueDye,
          } satisfies WearableClientDescriptor,
        ],
      ];
    })
  );

  if (unknownWearablesDetected) {
    log.warn("Unknown parameters while parsing asset request URL.");
  }

  // Sanitize skin color
  const parsedSkinColorId = url.searchParams.get(SKIN_COLOR_KEY);
  const sanitizedSkinColorId = isPaletteOption(
    "color_palettes/skin_colors",
    parsedSkinColorId
  )
    ? parsedSkinColorId
    : undefined;
  if (!sanitizedSkinColorId) {
    log.warn("Invalid skin color value received.");
  }

  // Sanitize eye color
  const parsedEyeColorId = url.searchParams.get(EYE_COLOR_KEY);
  const sanitizedEyeColorId = isPaletteOption(
    "color_palettes/eye_colors",
    parsedEyeColorId
  )
    ? parsedEyeColorId
    : undefined;
  if (!sanitizedEyeColorId) {
    log.warn("Invalid eye color value received.");
  }

  // Sanitize hair color
  const parsedHairColorId = url.searchParams.get(HAIR_COLOR_KEY);
  const sanitizedHairColorId = isPaletteOption(
    "color_palettes/hair_colors",
    parsedHairColorId
  )
    ? parsedHairColorId
    : undefined;
  if (!sanitizedHairColorId) {
    log.warn("Invalid hair color value received.");
  }

  return {
    kind: "SlotToWearableMapResults",
    warning: assetVersionMismatch
      ? { kind: "AssetVersionMismatch" }
      : undefined,
    map: resultMap,
    skinColorId: sanitizedSkinColorId,
    eyeColorId: sanitizedEyeColorId,
    hairColorId: sanitizedHairColorId,
  };
}

function parseDyeType(
  dyeString: string
): PaletteOption<"color_palettes/item_primary_colors"> | undefined {
  if (isPaletteOption("color_palettes/item_primary_colors", dyeString)) {
    return dyeString;
  } else {
    return undefined;
  }
}

export const BIKKIE_ID_TO_WEARABLE_SLOT = new Map<
  BiomesId,
  CharacterWearableSlot
>([
  [BikkieIds.head, "head"],
  [BikkieIds.hair, "hair"],
  [BikkieIds.hat, "hat"],
  [BikkieIds.bottoms, "bottoms"],
  [BikkieIds.face, "face"],
  [BikkieIds.top, "top"],
  [BikkieIds.neck, "neck"],
  [BikkieIds.outerwear, "outerwear"],
  [BikkieIds.ears, "ears"],
  [BikkieIds.hands, "hands"],
  [BikkieIds.feet, "feet"],
]);

export const WEARABLE_SLOT_TO_BIKKIE_ID = new Map<
  CharacterWearableSlot,
  BiomesId
>(mapMap(BIKKIE_ID_TO_WEARABLE_SLOT, (v, k) => [v, k] as const));
