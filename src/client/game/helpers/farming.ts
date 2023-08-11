import type {
  ClientReactResources,
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import * as Shards from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { floor } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";

export function farmingAt(
  resources: ClientResources | ClientReactResources | ClientResourceDeps,
  worldPos: ReadonlyVec3
): BiomesId | undefined {
  const pos = floor(worldPos);
  const shardId = Shards.voxelShard(...pos);
  const blockPos = Shards.blockPos(...pos);
  const occupancyId = resources
    .get("/terrain/farming", shardId)
    ?.get(...blockPos) as BiomesId;
  return occupancyId ? occupancyId : undefined;
}

export function isPlantExperimentalId(
  resources: ClientResources | ClientReactResources | ClientResourceDeps,
  entityId: BiomesId | undefined
) {
  return entityId && resources.get("/ecs/c/farming_plant_component", entityId);
}

export function plantExperimentalAt(
  resources: ClientResources | ClientReactResources | ClientResourceDeps,
  worldPos: ReadonlyVec3
): BiomesId | undefined {
  const growthId = farmingAt(resources, worldPos);
  return isPlantExperimentalId(resources, growthId) ? growthId : undefined;
}
