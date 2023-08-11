import type { ClientContextSubset } from "@/client/game/context";
import type { Events } from "@/client/game/context_managers/events";
import type { ClientTable } from "@/client/game/game";
import type {
  ClientReactResources,
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import { terrainCollides } from "@/shared/asset_defs/quirk_helpers";

import type { ShapeName } from "@/shared/asset_defs/shapes";
import {
  getShapeName,
  isomorphismsEquivalent,
} from "@/shared/asset_defs/shapes";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { using } from "@/shared/deletable";
import type { ReadonlyBox } from "@/shared/ecs/gen/components";
import { CreateCraftingStationEvent } from "@/shared/ecs/gen/events";
import { BlueprintSelector } from "@/shared/ecs/gen/selectors";
import type {
  Item,
  ItemAndCount,
  ItemBag,
  ReadonlyVec3f,
} from "@/shared/ecs/gen/types";
import { blueprintTerrainMatch } from "@/shared/game/blueprint";
import {
  boxToAabb,
  groupTensorEntryAt,
  groupTensorLayers,
  isomorphismForTensorEntry,
  scanGroupTensor,
  setGroupEntry,
  terrainIdForTensorEntry,
} from "@/shared/game/group";
import { fromBlockId } from "@/shared/game/ids";
import { anItem } from "@/shared/game/item";
import {
  addToBag,
  bagCount,
  containerToBag,
  countOf,
  getItemTypeId,
  itemCountToApproximateNumber,
} from "@/shared/game/items";
import { getAabbForPlaceableEntity } from "@/shared/game/placeables";
import * as Shards from "@/shared/game/shard";
import type { BlueprintHit, RequiredItem } from "@/shared/game/spatial";
import { traceEntities } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import type { RayIntersection } from "@/shared/math/linear";
import { add, dist, floor, intersectRayAabb } from "@/shared/math/linear";
import type { AABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { fireAndForget } from "@/shared/util/async";
import type { VoxelooModule } from "@/shared/wasm/types";
import {
  isBlockGroupEntry,
  isEmptyGroupEntry,
  type GroupTensor,
} from "@/shared/wasm/types/galois";
import { ok } from "assert";
import { last } from "lodash";

function tensorCompleted(
  blueprintId: BiomesId,
  resources: ClientResources | ClientResourceDeps,
  tensor: GroupTensor,
  box: ReadonlyBox
) {
  for (const { tensorPos, tensorEntry } of scanGroupTensor(tensor)) {
    const worldPos = add(tensorPos, box.v0);
    const shardId = Shards.voxelShard(...worldPos);
    const blockPos = Shards.blockPos(...worldPos);
    const editsBlock = resources.get("/terrain/volume", shardId);
    const editsTerrainID = editsBlock?.get(...blockPos);
    const tensorTerrainId = terrainIdForTensorEntry(tensorEntry);
    const tensorIsomorphism = isomorphismForTensorEntry(tensorEntry);
    const blockMatched = blueprintTerrainMatch(
      blueprintId,
      tensorTerrainId,
      editsTerrainID
    );
    if (!blockMatched) {
      return false;
    }
    const isomorphismTensor = resources.get("/terrain/isomorphisms", shardId);
    const shapeMatched = isomorphismsEquivalent(
      tensorIsomorphism ?? 0,
      isomorphismTensor?.get(...blockPos) ?? 0
    );
    if (!shapeMatched) {
      return false;
    }
  }
  return true;
}

export function isBlueprintCompleted(
  resources: ClientResources | ClientResourceDeps,
  entityId: BiomesId
): boolean {
  const data = resources.get("/groups/blueprint/data", entityId);
  const blueprintComponent = resources.get(
    "/ecs/c/blueprint_component",
    entityId
  );
  if (!data || !blueprintComponent) {
    return false;
  }
  return tensorCompleted(
    blueprintComponent.blueprint_id,
    resources,
    data.tensor,
    data.box
  );
}

export function isBlueprintEmpty(
  resources: ClientResources | ClientResourceDeps,
  entityId: BiomesId
) {
  const data = resources.get("/groups/blueprint/data", entityId);
  if (!data) {
    return true;
  }

  for (const { tensorPos } of scanGroupTensor(data.tensor)) {
    const worldPos = add(tensorPos, data.box.v0);
    if (isTerrainAtPosition(resources, worldPos)) {
      return false;
    }
  }

  return true;
}

export function getBlueprintActiveLayer(
  { voxeloo }: { voxeloo: VoxelooModule },
  resources: ClientResources | ClientResourceDeps,
  entityId: BiomesId
): number | undefined {
  const data = resources.get("/groups/blueprint/data", entityId);
  const blueprintComponent = resources.get(
    "/ecs/c/blueprint_component",
    entityId
  );
  if (!data || !blueprintComponent) {
    return;
  }

  // This could be a lot more efficient...
  const totalLayers = groupTensorLayers(data.tensor);
  for (let layer = 0; layer < totalLayers; layer++) {
    const completed = using(new voxeloo.GroupTensorBuilder(), (builder) => {
      data.tensor.scan((pos, val) => {
        if (pos[1] === layer) {
          setGroupEntry(builder, pos, val);
          return;
        }
      });
      return using(builder.build(), (layerTensor) => {
        return tensorCompleted(
          blueprintComponent.blueprint_id,
          resources,
          layerTensor,
          data.box
        );
      });
    });
    if (!completed) {
      return layer;
    }
  }
}

export type BuildAction =
  | {
      kind: "place";
      terrainId: TerrainID;
    }
  | { kind: "destroy" }
  | { kind: "shape"; shapeName: ShapeName };

export function checkActionAllowedIfBlueprintVoxel(
  entityId: BiomesId | undefined,
  resources: ClientResources,
  pos: ReadonlyVec3,
  action: BuildAction
) {
  if (!entityId) {
    return true;
  }
  const requiredItem = getRequiredItemAtPosition(entityId, resources, pos);
  if (!requiredItem) {
    return true;
  }
  ok(requiredItem.kind === "terrain"); // TODO: Support placeables.
  switch (action.kind) {
    case "place":
      return blueprintTerrainMatch(
        requiredItem.blueprintId,
        action.terrainId,
        requiredItem.terrainId
      );
    case "destroy":
      return true;
    case "shape":
      const requiredItemHasShape = (requiredItem.isomorphism ?? 0) > 1;
      const shapeId = (requiredItem.isomorphism ?? 0) >> 6;
      const requiredShapeName = getShapeName(shapeId);
      return requiredItemHasShape && action.shapeName === requiredShapeName;
  }
}

export function getBlueprintAtPosition(
  table: ClientTable,
  pos: ReadonlyVec3f
): { id: BiomesId; aabb: AABB; blueprintItem: Item } | undefined {
  for (const entity of table.scan(
    BlueprintSelector.query.spatial.atPoint(pos)
  )) {
    if (entity.blueprint_component) {
      return {
        id: entity.id,
        aabb: getAabbForPlaceableEntity(entity)!,
        blueprintItem: anItem(entity.blueprint_component.blueprint_id),
      };
    }
  }
}

export function getRequiredItemAtPosition(
  entityId: BiomesId,
  resources: ClientResources | ClientResourceDeps,
  pos: ReadonlyVec3f
): RequiredItem | undefined {
  const blueprintComponent = resources.get(
    "/ecs/c/blueprint_component",
    entityId
  );
  if (!blueprintComponent) {
    return;
  }
  const data = resources.get("/groups/blueprint/data", entityId);
  if (!data) {
    return;
  }
  const entry = groupTensorEntryAt(data.tensor, data.box, floor(pos));
  if (entry === undefined) {
    return;
  }
  ok(isBlockGroupEntry(entry), "We don't support flora yet");
  // TODO: Add placeables support.
  const terrainId = fromBlockId(entry.block.block_id);
  if (!terrainId) {
    return;
  }
  return {
    kind: "terrain",
    position: pos,
    terrainId,
    isomorphism: entry.block.isomorphism_id,
    blueprintId: blueprintComponent.blueprint_id,
  };
}

export function getCursorBlueprintVoxel(
  resources: ClientResources | ClientResourceDeps,
  entityId: BiomesId,
  from: ReadonlyVec3,
  dir: ReadonlyVec3
): Vec3 | undefined {
  const data = resources.get("/groups/blueprint/data", entityId);
  const blueprint = resources.get("/groups/blueprint/state", entityId);
  if (!data || !blueprint) {
    return;
  }
  let closest: RayIntersection | undefined;
  let closestPos: Vec3 | undefined;
  data.tensor.scan((pos, val) => {
    if (isEmptyGroupEntry(val)) {
      return;
    }
    if (pos[1] !== blueprint.activeLayer) {
      return;
    }
    const worldPos = add(pos, data.box.v0);
    const aabb: AABB = [worldPos, add(worldPos, [1, 1, 1])];
    const intersection = intersectRayAabb(from, dir, aabb);
    if (!intersection) {
      return;
    }
    if (!closest || intersection.distance < closest.distance) {
      closest = intersection;
      closestPos = worldPos;
    }
  });
  return closestPos;
}

export function isWaterAtPosition(
  resources: ClientResources | ClientResourceDeps | ClientReactResources,
  worldPos: ReadonlyVec3
) {
  const shardId = Shards.voxelShard(...worldPos);
  const blockPos = Shards.blockPos(...worldPos);
  const waterTensor = resources.get("/water/tensor", shardId);
  return !!waterTensor.get(...blockPos);
}

export function terrainAtPosition(
  resources: ClientResources | ClientResourceDeps | ClientReactResources,
  worldPos: ReadonlyVec3
) {
  const shardId = Shards.voxelShard(...worldPos);
  const blockPos = Shards.blockPos(...worldPos);
  const block = resources.get("/terrain/volume", shardId);
  return block?.get(...blockPos);
}

export function isTerrainAtPosition(
  resources: ClientResources | ClientResourceDeps | ClientReactResources,
  worldPos: ReadonlyVec3
) {
  return !!terrainAtPosition(resources, worldPos);
}

export function isFloraAtPosition(
  resources: ClientResources | ClientResourceDeps | ClientReactResources,
  worldPos: Vec3
) {
  const shardId = Shards.voxelShard(...worldPos);
  const blockPos = Shards.blockPos(...worldPos);
  const block = resources.get("/terrain/flora/tensor", shardId);
  return !!block?.get(...blockPos);
}

export function isNonCollidingTerrainAtPosition(
  resources: ClientResources | ClientResourceDeps | ClientReactResources,
  worldPos: ReadonlyVec3
) {
  const shardId = Shards.voxelShard(...worldPos);
  const blockPos = Shards.blockPos(...worldPos);
  const block = resources.get("/terrain/tensor", shardId);
  const terrainId = block?.get(...blockPos);
  return terrainId !== undefined && !terrainCollides(terrainId);
}

export function doCreateCraftingStation(
  resources: ClientResources,
  events: Events,
  entityId: BiomesId
) {
  const tweaks = resources.get("/tweaks");
  const data = resources.get("/groups/blueprint/data", entityId);
  if (tweaks.building.eagerBlocks) {
    // Clear eager blocks.
    if (data) {
      for (const shardId of Shards.shardsForAABB(data.box.v0, data.box.v1)) {
        resources.update("/terrain/eager_edits", shardId, (val) => {
          val.edits = [];
          return val;
        });
      }
    }
  }
  const localPlayer = resources.get("/scene/local_player");
  if (data) {
    localPlayer.craftingStation = {
      entityId,
      aabb: boxToAabb(data.box),
    };
  }
  fireAndForget(
    events.publish(
      new CreateCraftingStationEvent({ id: entityId, user_id: localPlayer.id })
    )
  );
}

export function getCraftingStationNameForBlueprintId(blueprintId: BiomesId) {
  const turnsInto = anItem(blueprintId).turnsInto;
  return anItem(turnsInto)?.displayName;
}

export function getCraftingStationNameForBlueprint(
  resources: ClientResources | ClientResourceDeps | ClientReactResources,
  entityId: BiomesId
): string | undefined {
  const blueprintComponent = resources.get(
    "/ecs/c/blueprint_component",
    entityId
  );
  if (!blueprintComponent) {
    return;
  }
  return getCraftingStationNameForBlueprintId(blueprintComponent.blueprint_id);
}

export function playerHasItemsRequiredForBlueprint(
  userId: BiomesId,
  resources: ClientResources | ClientReactResources | ClientResourceDeps,
  blueprintId: BiomesId
) {
  if (anItem(blueprintId).isTemplate) {
    return true;
  }

  const inventory = resources.get("/ecs/c/inventory", userId);
  ok(inventory);

  const inventoryBag: ItemBag = new Map<string, ItemAndCount>();
  addToBag(inventoryBag, containerToBag(inventory.items));
  addToBag(inventoryBag, containerToBag(inventory.hotbar));

  const requiredItems = resources.get(
    "/groups/blueprint/required_items",
    blueprintId
  );

  for (const [itemId, count] of requiredItems) {
    const typeId = getItemTypeId(anItem(itemId));
    const owned = itemCountToApproximateNumber(
      countOf(
        itemId,
        bagCount(inventoryBag, anItem(typeId), { allowTypeMatch: true })
      )
    );
    if (count > owned) {
      return false;
    }
  }
  return true;
}

export function traceBlueprints(
  deps: ClientContextSubset<"resources" | "table">,
  from: ReadonlyVec3,
  dir: ReadonlyVec3,
  maxDistance: number
) {
  const blueprintEntityHits = traceEntities(deps.table, from, dir, {
    maxDistance,
    entityFilter: (e) => !!e.blueprint_component,
  });
  const blueprintEntityId = last(blueprintEntityHits)?.entity.id;
  const blueprintPos = blueprintEntityId
    ? getCursorBlueprintVoxel(deps.resources, blueprintEntityId, from, dir)
    : undefined;
  const blueprintDist = blueprintPos
    ? dist(add(blueprintPos, [0.5, 0.5, 0.5]), from)
    : undefined;
  const requiredItem =
    blueprintEntityId && blueprintPos
      ? getRequiredItemAtPosition(
          blueprintEntityId,
          deps.resources,
          blueprintPos
        )
      : undefined;
  const blueprintHit =
    blueprintDist && blueprintPos && requiredItem
      ? <BlueprintHit>{
          kind: "blueprint",
          pos: blueprintPos,
          distance: blueprintDist,
          blueprintEntityId,
          requiredItem,
        }
      : undefined;
  return blueprintHit;
}
