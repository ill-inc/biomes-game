import type { AclChecker, EventContext } from "@/server/logic/events/core";
import { RollbackError } from "@/server/logic/events/core";
import { AabbTerrainIterator } from "@/server/logic/events/occupancy";
import { involvedShards } from "@/server/logic/utils/groups";
import { maybeSetRestoreTo } from "@/server/logic/utils/restoration";
import { terrainCollides } from "@/shared/asset_defs/quirk_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  AppearanceComponent,
  Collideable,
  ContainerInventory,
  CraftingStationComponent,
  CreatedBy,
  Irradiance,
  LockedInPlace,
  Orientation,
  PlaceableComponent,
  PlacedBy,
  Position,
  PricedContainerInventory,
  Size,
  Unmuck,
  Wearing,
} from "@/shared/ecs/gen/components";
import type { DeltaWith } from "@/shared/ecs/gen/delta";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { Item, Vec2f, Vec3f } from "@/shared/ecs/gen/types";
import { aabbToBox } from "@/shared/game/group";
import { anItem } from "@/shared/game/item";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import { projectsProtectionComponentsFromAttribute } from "@/shared/game/protection";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { sizeAABB } from "@/shared/math/linear";
import type { ReadonlyVec2, ReadonlyVec3 } from "@/shared/math/types";
import { ok } from "assert";

export function sizeForPlacable(
  itemId: BiomesId,
  position?: ReadonlyVec3
): Size | undefined {
  const box = getAabbForPlaceable(itemId, position ?? [0, 0, 0], undefined);
  return box ? Size.create({ v: sizeAABB(box) }) : undefined;
}

export function newPlaceable({
  id,
  creatorId,
  position,
  orientation,
  item,
  timestamp,
  craftingStation,
}: {
  id: BiomesId;
  creatorId: BiomesId | undefined;
  position: Vec3f;
  orientation: Vec2f;
  item: Item;
  timestamp?: number;
  craftingStation?: boolean;
}): Entity {
  timestamp ??= secondsSinceEpoch();
  return {
    id,
    position: Position.create({ v: position }),
    orientation: Orientation.create({
      v: orientation,
    }),
    size: sizeForPlacable(item.id, position),
    created_by: creatorId
      ? CreatedBy.create({ id: creatorId, created_at: timestamp })
      : undefined,
    placed_by: creatorId
      ? PlacedBy.create({ id: creatorId, placed_at: timestamp })
      : undefined,
    placeable_component: PlaceableComponent.create({
      item_id: item.id,
    }),
    collideable: Collideable.create(),
    crafting_station_component: craftingStation
      ? CraftingStationComponent.create()
      : undefined,
    ...placeableItemProperties(item, creatorId, timestamp),
  };
}

export function placeableItemProperties(
  item: Item,
  creatorId: BiomesId | undefined,
  timestamp?: number
): Omit<Entity, "id"> {
  return {
    wearing: item.isOutfit ? Wearing.create() : undefined,
    appearance_component: item.isOutfit
      ? AppearanceComponent.create({
          appearance: {
            eye_color_id: "eye_color_0",
            skin_color_id: `skin_color_0`,
            hair_color_id: "hair_color_8",
            head_id: BikkieIds.androgenous,
          },
        })
      : undefined,
    container_inventory:
      item.isContainer || item.isMailbox
        ? ContainerInventory.create({
            items: new Array(item.numSlots),
          })
        : undefined,
    priced_container_inventory: item.isShopContainer
      ? PricedContainerInventory.create({
          items: new Array(item.numSlots),
        })
      : undefined,
    crafting_station_component: item.isCraftingStation
      ? CraftingStationComponent.create()
      : undefined,
    unmuck: item.unmuck ? Unmuck.create({ ...item.unmuck }) : undefined,
    ...(item.projectsProtection
      ? projectsProtectionComponentsFromAttribute(
          item.projectsProtection,
          creatorId,
          timestamp
        )
      : undefined),
    irradiance: item.irradiance
      ? Irradiance.create({
          intensity: item.irradiance.intensity,
          color: item.irradiance.color,
        })
      : undefined,
    // Placeables are all immovable by default. Robots can be moved, but
    // it first takes an event to unlock them.
    locked_in_place: LockedInPlace.create(),
  };
}

export function involvedShardsForPlaceable(
  itemId: BiomesId,
  position: ReadonlyVec3,
  orientation: ReadonlyVec2
) {
  const aabb = getAabbForPlaceable(itemId, position, orientation);
  ok(aabb);
  return involvedShards(aabbToBox(aabb));
}

export function checkAndOccupyTerrainForPlaceable(
  placeableId: BiomesId | undefined,
  allTerrain: Terrain[],
  itemId: BiomesId,
  position: ReadonlyVec3,
  orientation: ReadonlyVec2,
  acl?: AclChecker
) {
  const displayName = anItem(itemId).displayName;
  const aabb = getAabbForPlaceable(itemId, position, orientation);
  ok(aabb);

  for (const { worldPos, blockPos, terrain } of new AabbTerrainIterator(
    allTerrain,
    aabb
  )) {
    const terrainId =
      terrain.diff.get(...blockPos) ?? terrain.seed.get(...blockPos);
    const occupancyId = terrain.occupancy.get(...blockPos);
    if (occupancyId) {
      // If this block is a player placed grass, we will end up here as we cannot
      // differentiate between placer and owning entity.
      // Perhaps in the future the client could tell us and we can verify on server.
      throw new RollbackError(
        `Cannot place ${displayName} here due to interference`
      );
    } else if (terrainId && terrainCollides(terrainId)) {
      throw new RollbackError(`Cannot place ${displayName} here`);
    } else if (terrainId) {
      if (acl !== undefined && !acl.can("destroy", { atPoints: [worldPos] })) {
        throw new RollbackError(
          "Cannot clear non-collideable terrain here due to ACLs."
        );
      }
      terrain.clearTerrainAt(blockPos, undefined);
    }
    if (placeableId) {
      terrain.mutableOccupancy.set(...blockPos, placeableId);
    }
  }
}

export function clearTerrainOccupancyForPlaceable(
  allTerrain: Terrain[],
  itemId: BiomesId,
  position: Vec3f,
  orientation: Vec2f
) {
  const aabb = getAabbForPlaceable(itemId, position, orientation);
  ok(aabb);

  for (const { blockPos, terrain } of new AabbTerrainIterator(
    allTerrain,
    aabb
  )) {
    terrain.mutableOccupancy.set(...blockPos, 0);
  }
}

export function onPlaceablePlace(
  placeable: DeltaWith<"placeable_component">,
  acl: AclChecker,
  context: EventContext<{}>
) {
  const timestamp = secondsSinceEpoch();

  if (placeable.videoComponent()) {
    // Reset playback to the beginning.
    placeable.mutableVideoComponent().video_start_time = timestamp;
  }
  maybeSetRestoreTo(acl.restoreTimeSecs("place"), placeable, "deleted");

  // Apply lifetime
  const item = anItem(placeable.placeableComponent().item_id);
  if (item.lifetime) {
    if (
      !placeable.restoresTo() ||
      (placeable.restoresTo()?.restore_to_state === "deleted" &&
        (placeable.restoresTo()?.trigger_at ?? Infinity) >=
          timestamp + item.lifetime)
    ) {
      placeable.setRestoresTo({
        restore_to_state: "deleted",
        trigger_at: timestamp + item.lifetime,
        expire: true,
      });
    }
  }

  // Send an ECS event
  const placeEvent = {
    kind: "place" as const,
    entityId: placeable.createdBy()?.id ?? INVALID_BIOMES_ID,
    item: item,
    position: [...(placeable.position()?.v ?? [0, 0, 0])] as Vec3f,
  };

  context.publish(placeEvent);
}
