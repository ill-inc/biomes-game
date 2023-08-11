import type { AnimaServerContext } from "@/server/anima/context";
import { NpcControllerService } from "@/server/anima/npc_controller_service";
import type { LogicApi } from "@/server/shared/api/logic";
import { NpcTracker } from "@/server/shared/npc/npc_tracker";
import type { AnimaReplica } from "@/server/shared/npc/table";
import {
  addReplicaBackedEcsResources,
  bufferedTableApply,
} from "@/server/shared/resources/replica_backed";
import {
  DEFAULT_TOTAL_SHARDS,
  type ShardManager,
  type ShardManagerEvents,
} from "@/server/shared/shard_manager/api";
import { makeShardManager } from "@/server/shared/shard_manager/register";
import type { ValueSharderEvents } from "@/server/shared/shard_manager/value_sharder";
import {
  ValueSharder,
  subscribeSharderToShardManager,
} from "@/server/shared/shard_manager/value_sharder";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import type { ReadonlyChanges } from "@/shared/ecs/change";
import type { AsDelta, ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import { EmitterSubscription } from "@/shared/events";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import {
  registerResourceInvalidationForTable,
  type EcsResourcePaths,
} from "@/shared/game/ecs_resources";
import { addSharedBlockResources } from "@/shared/game/resources/blocks";
import { addSharedFloraResources } from "@/shared/game/resources/florae";
import { addSharedGlassResources } from "@/shared/game/resources/glass";
import { addSharedIsomorphismResources } from "@/shared/game/resources/isomorphisms";
import type { LightingResourcePaths } from "@/shared/game/resources/light";
import { addSharedLightingResources } from "@/shared/game/resources/light";
import { addSharedPhysicsResources } from "@/shared/game/resources/physics";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import { addSharedTerrainResources } from "@/shared/game/resources/terrain";
import { addSharedWaterResources } from "@/shared/game/resources/water";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { createGauge } from "@/shared/metrics/metrics";
import { allNpcs, allSpawnEvents } from "@/shared/npc/bikkie";
import type { RegistryLoader } from "@/shared/registry";
import { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { TypedResources } from "@/shared/resources/types";
import { sleep } from "@/shared/util/async";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { hostname } from "os";

type AnimaResourcePaths = TerrainResourcePaths &
  LightingResourcePaths &
  EcsResourcePaths &
  IndexedEcsResourcePaths;

type NpcSharderUpdate = AsDelta<ReadonlyEntityWith<"npc_metadata">>;

export class AnimaServer {
  private shardManager?: ShardManager;
  private resources?: TypedResources<AnimaResourcePaths>;
  // Used to keep track of some cvals such as the number of spawn events we're
  // managing.
  private managedNpcs?: NpcTracker;
  private npcSharder?: ValueSharder<BiomesId, NpcSharderUpdate>;

  // System responsible for applying NPC logic to each of the managed NPCs.
  private npcControllerService?: NpcControllerService;

  private npcSharderSubscription?: EmitterSubscription<
    ValueSharderEvents<BiomesId>
  >;
  private shardManagerSubscription?: EmitterSubscription<ShardManagerEvents>;

  private controller = new BackgroundTaskController();

  private cleanUps: (() => Promise<void> | void)[] = [];

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: AnimaServerContext["replica"],
    private readonly logicApi: LogicApi,
    private readonly worldApi: WorldApi
  ) {
    createGauge({
      name: "anima_managed_npc_count",
      help: "Number of NPCs currently managed by this anima instance.",
      labelNames: ["type"],
      collect: (g) => {
        for (const npc of allNpcs()) {
          const npcsOfType = this.managedNpcs?.npcs(npc.id);
          if (npcsOfType) {
            g.set({ type: npc.name }, npcsOfType.size);
          } else {
            g.set({ type: npc.name }, 0);
          }
        }
      },
    });
    createGauge({
      name: "anima_managed_spawn_event_count",
      help: "Number of spawn events managed by this anima instance.",
      labelNames: ["type"],
      collect: (g) => {
        for (const spawnEvent of allSpawnEvents()) {
          const spawnEvents = this.managedNpcs?.spawnEvents(spawnEvent.id);
          if (spawnEvents) {
            g.set({ type: spawnEvent.name }, spawnEvents.size);
          }
        }
      },
    });
    createGauge({
      name: "anima_shards_acquired",
      help: "Number of shards currently acquired by this server.",
      collect: (g) => {
        g.set(this.shardManager?.held.size ?? 0);
      },
    });
    createGauge({
      name: "anima_total_shard_tick_time_ms",
      help: "The total number of milliseconds it takes to tick all owned shards.",
      collect: (g) => {
        g.set(this.totalNpcTickTimeMs());
      },
    });
    log.info(`Starting anima server with hostname: ${hostname()}`);
  }

  private totalNpcTickTimeMs(): number {
    return Array.from(this.shardManager?.held ?? []).reduce(
      (a, v) => a + (this.npcControllerService?.tickDurationForShard(v) ?? 0),
      0
    );
  }

  private initializeShardTracking() {
    log.info("Initializing shard tracking");
    this.managedNpcs = new NpcTracker();
    this.npcSharder = new ValueSharder((entity: NpcSharderUpdate) => [
      entity.id,
      entity.npc_metadata
        ? entity.id % (this.shardManager?.total ?? DEFAULT_TOTAL_SHARDS)
        : undefined,
    ]);

    this.npcSharderSubscription = new EmitterSubscription(this.npcSharder, {
      change: (delta) => {
        for (const [id, added] of delta) {
          if (added) {
            const metadata = this.replica.table.get(id)?.npc_metadata;
            ok(metadata);
            this.managedNpcs?.trackNpc(id, metadata);
          } else {
            this.managedNpcs?.untrackNpc(id);
          }
        }
      },
    });
  }

  private async startShardTracking() {
    ok(this.npcSharder);
    log.info("Starting shard tracking");
    this.shardManager = await makeShardManager("anima");
    this.shardManagerSubscription = subscribeSharderToShardManager(
      this.shardManager,
      this.npcSharder
    );
  }

  private async startChangeProcessing() {
    const builtResources = await buildResources(
      this.voxeloo,
      this.replica,
      30000
    );
    this.resources = builtResources.resources;

    this.cleanUps.push(builtResources.stop);
    const tableEventSubscription = new EmitterSubscription(
      this.replica.table.events,
      {
        postApply: (changes) => {
          if (this.npcSharder) {
            this.npcSharder.update(changesToSharderUpdates(changes));
          }
        },
      }
    );
    this.cleanUps.push(() => tableEventSubscription.off());
    const flushChanges = () => {
      builtResources.flushChanges();

      this.refreshShardManagerParams();

      // Garbage collect resources.
      builtResources.resources.collect();
    };
    await this.replica.start();
    flushChanges();

    // Flush changes in the background to make npc controller ticks more
    // responsive.
    this.controller.runInBackground("flushReplicaChanges", async (signal) => {
      while (await sleep(CONFIG.animaNpcTickTimeMs, signal)) {
        flushChanges();
      }
    });
  }

  async start() {
    this.initializeShardTracking();
    await this.startChangeProcessing();
    await this.startShardTracking();

    this.npcControllerService = new NpcControllerService(
      this.voxeloo,
      this.replica.table,
      this.resources!,
      () => this.npcSharder!.heldShards,
      (shardId) => this.npcSharder!.valuesForShard(shardId),
      this.logicApi,
      this.worldApi
    );

    await this.npcControllerService.start();
    await this.shardManager!.start();
    log.info("Anima server is running!");
  }

  async stop() {
    for (const cleanup of this.cleanUps.reverse()) {
      await cleanup();
    }
    this.cleanUps = [];

    // Release all our held shards as we're no longer available to process them.
    await this.shardManager?.stop();

    await this.controller.abortAndWait();
    await this.npcControllerService?.stop();
    await this.replica.stop();
    this.shardManagerSubscription?.off();
    this.npcSharderSubscription?.off();
  }

  private refreshShardManagerParams() {
    if (this.npcControllerService) {
      for (const shard of this.shardManager?.held ?? []) {
        this.shardManager?.reportWeight(
          shard,
          this.npcControllerService.tickDurationForShard(shard) ?? 0
        );
      }
    }
  }
}

export async function registerAnimaServer<C extends AnimaServerContext>(
  loader: RegistryLoader<C>
) {
  const [voxeloo, replica, logicApi, worldApi] = await Promise.all([
    loader.get("voxeloo"),
    loader.get("replica"),
    loader.get("logicApi"),
    loader.get("worldApi"),
  ]);

  return new AnimaServer(voxeloo, replica, logicApi, worldApi);
}

function changesToSharderUpdates(changes: ReadonlyChanges) {
  const sharderUpdates: NpcSharderUpdate[] = [];
  for (const change of changes) {
    if (change.kind === "delete") {
      sharderUpdates.push({ id: change.id, npc_metadata: null });
    } else {
      if (change.entity.npc_metadata === undefined) {
        // If the npc_metadata component wasn't touched, then the sharder
        // can ignore this change.
        continue;
      }
      sharderUpdates.push({
        id: change.entity.id,
        npc_metadata: change.entity.npc_metadata,
      });
    }
  }
  return sharderUpdates;
}

async function buildResources(
  voxeloo: VoxelooModule,
  replica: AnimaReplica,
  capacity: number
) {
  const builder = new BiomesResourcesBuilder<AnimaResourcePaths>({
    collectorParams: {
      // Monitored memory at one point and found that with ~100000 resources
      // resident, we were using ~133MB of WASM memory.
      capacities: { count: capacity },
    },
  });

  addSharedTerrainResources(voxeloo, builder);
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
