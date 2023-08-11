import type { WearablesAssignment } from "@/server/gizmo/state";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import type { WearableSlot } from "@/shared/bikkie/ids";
import { WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import type { ChatMessage } from "@/shared/chat/messages";
import type { ItemAndCount, ShardId, Vec3f } from "@/shared/ecs/gen/types";
import type { EcsResourcePaths } from "@/shared/game/ecs_resources";
import { anItem } from "@/shared/game/item";
import { playerAABB } from "@/shared/game/players";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import * as Shards from "@/shared/game/shard";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { isZero, offsetFromContainerAABB } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { TypedResources } from "@/shared/resources/types";

const wearablesBySlot = bikkieDerived("wearablesBySlot", () => {
  const map: Map<WearableSlot, BiomesId[]> = new Map(
    WEARABLE_SLOTS.map((x) => [x, []])
  );

  getBiscuits(bikkie.schema.items.wearables).forEach((biscuit) => {
    WEARABLE_SLOTS.forEach((slot) => {
      if (
        slot != biscuit.id &&
        findItemEquippableSlot(anItem(biscuit.id), [slot]) &&
        isSelectableItem(biscuit)
      ) {
        map.get(slot)!.push(biscuit.id);
      }
    });
  });
  return map;
});

export function randomWearableForSlot(
  slot: WearableSlot
): BiomesId | undefined {
  // Use rejection sampling to choose a wearable with a matching slot.
  const wearablesForSlot = wearablesBySlot().get(slot)!;
  return wearablesForSlot[Math.floor(Math.random() * wearablesForSlot.length)];
}

export function chooseRandomWearables(): WearablesAssignment {
  return new Map(WEARABLE_SLOTS.map((x) => [x, randomWearableForSlot(x)]));
}

export function isSelectableItem(biscuit: Biscuit) {
  return (
    // Make sure the item has a mesh
    biscuit.mesh &&
    // Don't choose an item that's not droppable.
    biscuit.isDroppable
  );
}

export function chooseRandomSelectableItem(): BiomesId | undefined {
  // Small chance to not equip any item.
  if (Math.random() < CONFIG.gremlinsChanceToEquipNothing) {
    return undefined;
  }

  // Choose a random selectable item.
  const options = getBiscuits(bikkie.schema.items)
    .filter((b) => isSelectableItem(b))
    .map(({ id }) => id);
  if (!options.length) {
    return undefined;
  }
  return options[Math.floor(Math.random() * options.length)];
}

export function addChatMessage(messages: ChatMessage[], n: number) {
  const newMessages: ChatMessage[] = [];
  for (let i = 0; i < n; i++) {
    newMessages.push({
      kind: "text",
      content:
        CONFIG.gremlinsChatMessages[
          Math.floor(Math.random() * CONFIG.gremlinsChatMessages.length)
        ],
    });
  }
  return [...messages, ...newMessages];
}

export function getContentsAtPosition(
  shardId: ShardId,
  blockPos: ReadonlyVec3,
  resources: TypedResources<TerrainResourcePaths>
): BiomesId | undefined {
  const occupancy = resources.get("/terrain/occupancy", shardId);
  const occupancyId = occupancy?.get(...blockPos);
  if (occupancyId) {
    return occupancyId as BiomesId;
  }
  const shard = resources.get("/terrain/tensor", shardId);
  if (!shard) {
    return;
  }
  const terrainId = shard.get(...blockPos);
  return terrainIdToBlock(terrainId)?.id;
}

export function playerIntersectingWithTerrain(
  position: Vec3f,
  resources: TypedResources<TerrainResourcePaths>
) {
  const aabb = playerAABB(position, 1);
  const shards = Shards.shardsForAABB(aabb[0], aabb[1]);
  for (const shard of shards) {
    const boxes = resources.get("/terrain/boxes", shard);
    if (boxes) {
      let didIntersect = false;
      boxes.intersect(aabb, () => {
        didIntersect = true;
      });
      if (didIntersect) {
        return true;
      }
    }
  }
  return false;
}

export function getBounds(resources: TypedResources<EcsResourcePaths>) {
  const worldMetadata = resources.get("/ecs/metadata");
  return [worldMetadata.aabb.v0, worldMetadata.aabb.v1] as const;
}

export function gremlinOutsideBounds(
  position: ReadonlyVec3,
  resources: TypedResources<EcsResourcePaths>
) {
  const playerAabb = playerAABB(position, 1);
  const bounds = getBounds(resources);
  const fromWorld = offsetFromContainerAABB(playerAabb, bounds);
  return !isZero(fromWorld);
}

export function itemAndCountForItemId(
  itemId: BiomesId | undefined
): ItemAndCount {
  const item = anItem(itemId || INVALID_BIOMES_ID);
  if (itemId === undefined) {
    return { item, count: 0n };
  }
  return {
    item,
    count: 1n,
  };
}
