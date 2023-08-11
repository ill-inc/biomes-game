import blueprintData from "@/shared/asset_defs/gen/blueprint_data.json";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import {
  terrainIdToBlock,
  terrainIdToBlockOrDie,
} from "@/shared/bikkie/terrain";
import { using } from "@/shared/deletable";
import { zVec2f, zVec3f } from "@/shared/ecs/gen/types";
import {
  isomorphismForTensorEntry,
  scanGroupTensor,
  terrainIdForTensorEntry,
} from "@/shared/game/group";
import { anItem } from "@/shared/game/item";
import {
  getItemTypeId,
  itemIsOfType,
  toolForShapeId,
} from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { z } from "zod";

export const zPlaceableEntry = z.object({
  item_id: z.number(),
  position: zVec3f,
  orientation: zVec2f,
});

export const zBlueprintData = z.object({
  name: z.string(),
  tensor: z.string(),
  placeables: z.array(zPlaceableEntry).optional(),
});

export type BlueprintData = z.infer<typeof zBlueprintData>;

const blueprintIdToEntry: Map<number, BlueprintData> = new Map(
  Object.entries(blueprintData).map(([k, v]) => {
    const blueprintId = parseInt(k, 10) as BiomesId;
    const entry = zBlueprintData.parse(v);
    return [blueprintId, entry];
  })
);

export function getBlueprintData(blueprintId: BiomesId): BlueprintData {
  const data = blueprintIdToEntry.get(blueprintId);
  ok(data);
  return data;
}

export function getTerrainTypeName(terrainId: TerrainID) {
  const item = terrainIdToBlock(terrainId);
  const typeId = getItemTypeId(item);
  return anItem(typeId)?.displayName;
}

export function blueprintItemsMatch(
  blueprintId: BiomesId,
  a: BiomesId | undefined,
  b: BiomesId | undefined
): boolean {
  if (a === undefined || b === undefined) {
    return false;
  }
  if (a === b) {
    return true;
  }

  if (
    anItem(a).isBlock &&
    anItem(b).isBlock &&
    anItem(blueprintId).isTemplate
  ) {
    return true;
  }

  const typeId = getItemTypeId(anItem(b));
  const typeItem = anItem(typeId);

  return itemIsOfType(anItem(a), typeItem);
}

export function blueprintTerrainMatch(
  blueprintId: BiomesId,
  a: TerrainID | undefined,
  b: TerrainID | undefined
) {
  return blueprintItemsMatch(
    blueprintId,
    a ? terrainIdToBlockOrDie(a).id : undefined,
    b ? terrainIdToBlockOrDie(b).id : undefined
  );
}

export function getBlueprintRequiredItems(
  voxeloo: VoxelooModule,
  blueprintId: BiomesId,
  tensorBlob: string
) {
  const map = new Map<BiomesId, number>();
  const isTemplate = anItem(blueprintId).isTemplate;
  using(new voxeloo.GroupTensor(), (tensor) => {
    tensor.load(tensorBlob);

    for (const { tensorEntry } of scanGroupTensor(tensor)) {
      const terrainId = terrainIdForTensorEntry(tensorEntry);
      const block = terrainIdToBlockOrDie(terrainId);
      const itemId = isTemplate ? block.id : getItemTypeId(block);
      map.set(itemId, 1 + (map.get(itemId) || 0));

      const iso = isomorphismForTensorEntry(tensorEntry);
      if (iso) {
        const toolItem = toolForShapeId(iso >> 6);
        if (toolItem) {
          map.set(toolItem.id, 1);
        }
      }
    }
  });
  return map;
}

export function getBlueprintItemTypeId(itemId: BiomesId) {
  switch (anItem(itemId).shape) {
    case "step":
      return BikkieIds.woodenStepper;
    case "slab":
      return BikkieIds.woodenSlabber;
    case "fence":
      return BikkieIds.woodenFencer;
    default:
      return itemId;
  }
}
