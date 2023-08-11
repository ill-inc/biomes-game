import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import { isPlayer } from "@/shared/game/players";
import * as Shards from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { floor } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";

export function occupancyAt(
  resources: ClientResources | ClientReactResources,
  worldPos: ReadonlyVec3
): BiomesId | undefined {
  const pos = floor(worldPos);
  const shardId = Shards.voxelShard(...pos);
  const blockPos = Shards.blockPos(...pos);
  const occupancyId = resources
    .get("/terrain/occupancy", shardId)
    ?.get(...blockPos) as BiomesId;
  return occupancyId ? occupancyId : undefined;
}

export function placerAt(
  resources: ClientResources | ClientReactResources,
  worldPos: ReadonlyVec3
): BiomesId | undefined {
  const pos = floor(worldPos);
  const shardId = Shards.voxelShard(...pos);
  const blockPos = Shards.blockPos(...pos);
  const placerId = resources
    .get("/terrain/placer", shardId)
    ?.get(...blockPos) as BiomesId;
  return placerId ? placerId : undefined;
}

export function isGroupId(
  resources: ClientResources | ClientReactResources,
  entityId: BiomesId | undefined
) {
  return entityId && resources.get("/ecs/c/group_component", entityId);
}

export function isPlayerId(
  resources: ClientResources | ClientReactResources,
  entityId: BiomesId | undefined
) {
  return entityId && isPlayer(resources.get("/ecs/entity", entityId));
}

export function isPlaceableId(
  resources: ClientResources | ClientReactResources,
  entityId: BiomesId | undefined
) {
  return entityId && resources.get("/ecs/c/placeable_component", entityId);
}

export function groupOccupancyAt(
  resources: ClientResources | ClientReactResources,
  worldPos: ReadonlyVec3
): BiomesId | undefined {
  const occupancyId = occupancyAt(resources, worldPos);
  return isGroupId(resources, occupancyId) ? occupancyId : undefined;
}

export function placeableOccupancyAt(
  resources: ClientResources | ClientReactResources,
  worldPos: ReadonlyVec3
): BiomesId | undefined {
  const occupancyId = occupancyAt(resources, worldPos);
  return isPlaceableId(resources, occupancyId) ? occupancyId : undefined;
}
