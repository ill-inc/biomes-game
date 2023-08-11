import { createGizmoTable } from "@/server/gizmo/table";
import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import type {
  IndexedEcsResourcePaths,
  IndexedResources,
} from "@/shared/game/ecs_indexed_resources";
import { getIndexedResources } from "@/shared/game/ecs_indexed_resources";
import type { EcsResourcePaths } from "@/shared/game/ecs_resources";
import {
  addTableResources,
  registerResourceInvalidationForTable,
} from "@/shared/game/ecs_resources";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import { addSharedTerrainResources } from "@/shared/game/resources/terrain";
import { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { TypedResources } from "@/shared/resources/types";
import { Latch } from "@/shared/util/async";
import type { VoxelooModule } from "@/shared/wasm/types";

export class GizmoEcs {
  private readonly controller = new BackgroundTaskController();
  private cleanups = [() => this.controller.abort()];
  public readonly table = createGizmoTable();
  public readonly resources: TypedResources<TerrainResourcePaths>;
  private readonly indexedResources: IndexedResources;
  private readonly ready = new Latch();

  constructor(voxeloo: VoxelooModule, worldApi: WorldApi) {
    this.indexedResources = getIndexedResources(this.table);

    const builder = new BiomesResourcesBuilder<
      TerrainResourcePaths & IndexedEcsResourcePaths & EcsResourcePaths
    >({
      collectorParams: {
        capacities: { count: 100000 },
      },
    });
    for (const indexedResource of this.indexedResources) {
      indexedResource.add(builder);
    }
    addSharedTerrainResources(voxeloo, builder);
    addTableResources(this.table, builder);
    this.resources = builder.build();

    this.cleanups.push(
      registerResourceInvalidationForTable(
        undefined,
        this.table,
        this.resources,
        this.indexedResources
      )
    );
    this.controller.runInBackground("replicate", async (signal) => {
      for await (const { changes, bootstrapped } of worldApi.subscribe(
        {},
        signal
      )) {
        if (changes) {
          this.table.apply(changes.map(materializeLazyChange));
        }
        if (bootstrapped) {
          this.ready.signal();
        }
      }
      this.ready.signal();
    });
  }

  async start() {
    await this.ready.wait();
  }

  async stop() {
    for (const cleanup of this.cleanups.reverse()) {
      cleanup();
    }
    this.cleanups = [];
  }

  gc() {
    this.resources.collect();
  }
}
