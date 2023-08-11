import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { NpcType, SpawnEvent } from "@/shared/npc/bikkie";
import { idToNpcType, npcGlobals } from "@/shared/npc/bikkie";
import type { MuckerWardIndexConfig } from "@/shared/npc/environment";
import type { TypedResources } from "@/shared/resources/types";
import type { VoxelooModule } from "@/shared/wasm/types";

export function isAggressiveNpc(npcType: NpcType): boolean {
  return !!npcType.behavior.chaseAttack;
}

export function containsAggressiveNpcs(spawnEvent: SpawnEvent): boolean {
  return (
    spawnEvent.npcBag.find(([npc]) => isAggressiveNpc(idToNpcType(npc))) !==
    undefined
  );
}

// Safe zones are places where NPCs will not attack players.
export function isSafeZone(
  voxeloo: VoxelooModule,
  position: ReadonlyVec3,
  metaIndex: MuckerWardIndexConfig,
  resources: TypedResources<TerrainResourcePaths>
): boolean {
  const nearbyWards = metaIndex.mucker_ward_selector.scanSphere({
    center: position,
    radius: npcGlobals().wardRange,
  });
  if (!nearbyWards.next().done) {
    // Wards are nearby, this is a safe zone.
    return true;
  }

  // Quest givers implicitly act as mucker wards.
  const nearbyQuestGivers = metaIndex.quest_giver_selector.scanSphere({
    center: position,
    radius: npcGlobals().wardRange,
  });
  if (!nearbyQuestGivers.next().done) {
    // A quest giver is nearby, this is a safe zone.
    return true;
  }

  const th = TerrainHelper.fromResources(voxeloo, resources);
  if (!th.isMucky(position)) {
    // The ground is not mucky, this is a safe zone.
    return true;
  }

  return false;
}
