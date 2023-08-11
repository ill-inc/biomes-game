import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import { resolvedImageUrlForSize } from "@/server/web/util/urls";
import { type Biscuit } from "@/shared/bikkie/schema/attributes";
import type { AnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import { staticUrlForAttribute } from "@/shared/bikkie/schema/binary";
import type { Item } from "@/shared/game/item";
import { getRecipeOutput } from "@/shared/game/recipes";
import type { TriggerIcon } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { anyMapValue } from "@/shared/util/collections";
import { resolveBinaryAttribute } from "@/shared/util/dye_helpers";
import { assertNever } from "@/shared/util/type_helpers";
import challengesIcon from "/public/hud/default-challenge-icon.png";
import defaultEquipmentIcon from "/public/hud/icon-16-equipment.png";

export function groupIconURL(groupId: BiomesId): string {
  return `/api/environment_group/${groupId}/thumbnail`;
}

export function getTriggerIconUrl(
  icon: TriggerIcon,
  seen?: Set<BiomesId>
): string | undefined {
  switch (icon.kind) {
    case "custom":
      return resolvedImageUrlForSize("thumbnail", icon.bundle);
    case "item":
      return iconUrl(icon.item, { seen });
    case "none":
      return undefined;
    default:
      assertNever(icon);
  }
}

export const ATTRIBUTE_TO_ICON: [
  keyof Biscuit,
  (
    value: unknown,
    extra: { seen?: Set<BiomesId>; item?: Item }
  ) => string | undefined
][] = [
  ["groupId", (value) => groupIconURL(value as BiomesId)],
  [
    "icon",
    (value, { item }) =>
      staticUrlForAttribute(
        resolveBinaryAttribute(value as AnyBinaryAttribute, item)
      ),
  ],
  [
    "triggerIcon",
    (value, { seen }) => getTriggerIconUrl(value as TriggerIcon, seen),
  ],
  ["galoisIcon", (value) => resolveAssetUrlUntyped(`icons/${value}`)],
  ["galoisPath", (value) => resolveAssetUrlUntyped(`icons/${value}`)],
  ["isQuest", () => challengesIcon.src],
];

export function iconUrl(
  item?: Item,
  {
    seen,
    defaultIcon,
  }: {
    seen?: Set<BiomesId>;
    defaultIcon?: string;
  } = {}
) {
  if (item && !seen?.has(item.id)) {
    seen ??= new Set();
    seen.add(item?.id);
    for (const [attribute, fn] of ATTRIBUTE_TO_ICON) {
      const value = item[attribute];
      if (!value) {
        continue;
      }
      const url = fn(value as string | BiomesId, { item, seen });
      if (url) {
        return url;
      }
    }
    if (item.isRecipe) {
      const url = getRecipeIconURL(item, seen);
      if (url) {
        return url;
      }
    }
  }
  return defaultIcon ?? defaultEquipmentIcon.src;
}

export function hasIconUrl(item: Item) {
  return iconUrl(item) !== defaultEquipmentIcon.src;
}

export function getRecipeIconURL(recipe: Item, seen?: Set<BiomesId>): string {
  const output = getRecipeOutput(recipe)!;
  return iconUrl(anyMapValue(output)?.item, { seen });
}
