import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { registerIdGenerator } from "@/server/shared/ids/generator";
import { runServer } from "@/server/shared/main";
import { NpcTracker } from "@/server/shared/npc/npc_tracker";
import type { AnimaReplica } from "@/server/shared/npc/table";
import { registerAnimaReplica } from "@/server/shared/npc/table";
import {
  addReplicaBackedEcsResources,
  bufferedTableApply,
} from "@/server/shared/resources/replica_backed";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import type { SpawnTerrainResourcePaths } from "@/server/spawn/resources/terrain";
import { addSpawnTerrainResources } from "@/server/spawn/resources/terrain";
import { SpawnService } from "@/server/spawn/spawn_service";
import { getTerrainColumns } from "@/server/spawn/terrain_column";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import {
  registerResourceInvalidationForTable,
  type EcsResourcePaths,
} from "@/shared/game/ecs_resources";
import { addSharedBlockResources } from "@/shared/game/resources/blocks";
import { addSharedFloraResources } from "@/shared/game/resources/florae";
import { addSharedGlassResources } from "@/shared/game/resources/glass";
import { addSharedIsomorphismResources } from "@/shared/game/resources/isomorphisms";
import { addSharedLightingResources } from "@/shared/game/resources/light";
import { addSharedPhysicsResources } from "@/shared/game/resources/physics";
import { addSharedWaterResources } from "@/shared/game/resources/water";
import { RegistryBuilder } from "@/shared/registry";
import { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";

export type SpawnResourcePaths = SpawnTerrainResourcePaths &
  EcsResourcePaths &
  IndexedEcsResourcePaths;

export interface SpawnServerContext extends SharedServerContext {
  replica: AnimaReplica;
  idGenerator: IdGenerator;
  worldApi: WorldApi;
  voxeloo: VoxelooModule;
}

export async function buildResources(
  voxeloo: VoxelooModule,
  replica: AnimaReplica,
  capacity: number
) {
  const builder = new BiomesResourcesBuilder<SpawnResourcePaths>({
    collectorParams: {
      // Monitored memory at one point and found that with ~100000 resources
      // resident, we were using ~133MB of WASM memory.
      capacities: { count: capacity },
    },
  });

  addSpawnTerrainResources(voxeloo, builder);
  addSharedLightingResources(voxeloo, builder);
  addSharedWaterResources(voxeloo, builder);
  addSharedPhysicsResources(voxeloo, builder);
  await Promise.all([
    addSharedBlockResources(voxeloo, builder),
    addSharedFloraResources(voxeloo, builder),
    addSharedGlassResources(voxeloo, builder),
    addSharedIsomorphismResources(voxeloo, builder),
  ]);

  const indexedResources = addReplicaBackedEcsResources(replica, builder);

  const resources = builder.build();

  const flushChanges = bufferedTableApply(replica);

  const stop = registerResourceInvalidationForTable(
    undefined,
    replica.table,
    resources,
    indexedResources
  );

  return {
    resources,
    flushChanges,
    stop,
  };
}

void runServer(
  "spawn",
  (signal) =>
    new RegistryBuilder<SpawnServerContext>()
      .install(sharedServerContext)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("idGenerator", registerIdGenerator)
      .bind("replica", registerAnimaReplica)
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    const builtResources = await buildResources(
      context.voxeloo,
      context.replica,
      20000
    );
    const resources = builtResources.resources;

    const flushChanges = () => {
      const changes = builtResources.flushChanges();

      // Update our set of managed NPCs according to the incoming changes.
      for (const change of changes) {
        if (change.kind !== "delete") {
          if (!change.entity.npc_metadata) {
            continue;
          }
          allNpcs.trackNpc(change.entity.id, change.entity.npc_metadata);
        } else {
          allNpcs.untrackNpc(change.id);
        }
      }

      // Garbage collect resources.
      resources.collect();
    };

    const allNpcs = new NpcTracker({ noLogging: {} });

    await context.replica.start();
    flushChanges();

    const managedTerrainColumns = getTerrainColumns(context.replica.table);

    const spawnService = new SpawnService(
      context.voxeloo,
      context.replica.table,
      resources,
      context.worldApi,
      context.idGenerator,
      managedTerrainColumns,
      allNpcs,
      flushChanges
    );

    await spawnService.start();
  }
);
