import type { IdGenerator } from "@/server/shared/ids/generator";
import type { NpcTracker } from "@/server/shared/npc/npc_tracker";
import type { WorldApi } from "@/server/shared/world/api";
import type { SpawnResourcePaths } from "@/server/spawn/main";
import { NpcSpawnContextBuilder } from "@/server/spawn/npc_spawn_context_builder";
import type { NpcSpawnInfo } from "@/server/spawn/spawn_npc";
import { makeSpawnChangeToApply } from "@/server/spawn/spawn_npc";
import {
  canSpawnAtTime,
  findSpawnEventPosition,
} from "@/server/spawn/spawn_point_criteria";
import type { TerrainColumn } from "@/server/spawn/terrain_column";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { NpcSelector } from "@/shared/ecs/gen/selectors";
import type { Table } from "@/shared/ecs/table";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { add } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import {
  containsAggressiveNpcs,
  isSafeZone,
} from "@/shared/npc/behavior/common";
import {
  allSpawnEvents,
  idToNpcType,
  idToSpawnEvent,
  spawnEventNpcCount,
} from "@/shared/npc/bikkie";
import { getMuckerWardIndexConfig } from "@/shared/npc/environment";
import type { TypedResources } from "@/shared/resources/types";
import { Latch, RepeatingAsyncTimer } from "@/shared/util/async";
import { weightedRandomIndex } from "@/shared/util/helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { setTimeout } from "timers/promises";

const npcsSpawned = createCounter({
  name: "anima_npcs_spawned",
  help: "Number of NPCs spawned.",
  labelNames: ["type"],
});

const npcCountTarget = createGauge({
  name: "anima_npc_count_target",
  help: "Number of NPCs that will be spawned according to NPC spawn event density settings.",
  labelNames: ["type"],
});

createGauge({
  name: "anima_global_npc_count_capacity",
  help: "The global limit for NPC spawning, according to server settings.",
  collect: (g) => {
    g.set(npcLimit());
  },
});

type SpawnServiceMetaIndex = ReturnType<typeof getSpawnServiceIndexConfig>;

function getSpawnServiceIndexConfig() {
  return {
    ...NpcSelector.createIndexFor.spatial(),
    ...getMuckerWardIndexConfig(),
  };
}

export type SpawnServiceTable = Table<SpawnServiceMetaIndex>;

// Periodically evaluates whether it's time to spawn a new NPC or not.
export class SpawnService {
  // For updating the terrain column candidate spawn points.
  private terrainTickTimer?: RepeatingAsyncTimer;
  // For actually spawning a NPC from a spawn point.
  private spawnTickTimer?: RepeatingAsyncTimer;

  // Maintains the indices used to choose where to spawn NPCs.
  private npcSpawnContextBuilder: NpcSpawnContextBuilder;

  // How many terrain scan ticks have we done?
  private terrainScanCount = 0;

  // We don't start spawning until we've scanned a threshold fraction of terrain
  // columns, keep track of whether we've previously passed that threshold so
  // that we can log when we do.
  private hasPassedTerrainThreshold = false;

  private logThrottleCount = 0;

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly table: SpawnServiceTable,
    private readonly resources: TypedResources<SpawnResourcePaths>,
    private readonly worldApi: WorldApi,
    private readonly idGenerator: IdGenerator,
    private readonly ownedTerrainColumns: TerrainColumn[],
    private readonly npcTracker: NpcTracker,
    private readonly flushChanges: () => void
  ) {
    this.npcSpawnContextBuilder = new NpcSpawnContextBuilder(
      this.resources,
      this.ownedTerrainColumns
    );

    log.info(
      `Spawn service initialized with ${ownedTerrainColumns.length} terrain columns to manage...`
    );
  }

  async start() {
    this.terrainTickTimer = new RepeatingAsyncTimer(
      () => {
        try {
          this.terrainTick();
        } catch (error) {
          log.throttledError(10_000, "Error in terrain tick!", { error });
        }
      },
      () => CONFIG.animaTerrainTickTimeMs
    );
    this.spawnTickTimer = new RepeatingAsyncTimer(
      async () => {
        try {
          await this.spawnTick();
        } catch (error) {
          log.throttledError(10_000, "Error in spawn tick!", { error });
        }
      },
      () => CONFIG.animaSpawnTickTimeMs
    );
  }

  async stop() {
    await this.terrainTickTimer?.stop();
    this.terrainTickTimer = undefined;
    await this.spawnTickTimer?.stop();
    this.spawnTickTimer = undefined;
  }

  private terrainTick() {
    this.flushChanges();

    this.npcSpawnContextBuilder.updateNext();

    ++this.terrainScanCount;

    if (this.passedTerrainScanSpawnThreshold()) {
      if (!this.hasPassedTerrainThreshold) {
        log.info(
          "Scanned all terrain at least once, can now begin spawning NPCs."
        );
        this.hasPassedTerrainThreshold = true;
      }
    }
  }

  private passedTerrainScanSpawnThreshold() {
    return this.terrainScanCount >= this.npcSpawnContextBuilder.terrainCount();
  }

  private maxSpawnEvents(spawnEventId: BiomesId) {
    const spawnEvent = idToSpawnEvent(spawnEventId);
    return spawnEvent.enabled
      ? Math.floor(
          CONFIG.animaGlobalSpawnDensityScale *
            spawnEvent.density *
            this.npcSpawnContextBuilder.numCandidates(spawnEventId)
        )
      : 0;
  }

  private chooseSpawnEventToTrigger(spawnEventIdBlackList: BiomesId[]) {
    if (!this.passedTerrainScanSpawnThreshold()) {
      // Don't spawn NPCs until we've scanned a threshold of terrain shards.
      return;
    }

    // Find how many NPCs would be spawned if all spawn event densities were
    // saturated were activated. We'll use that to scale our target spawn event
    // counts by so that if we would go over the limit, we at least stay
    // proportional.
    let maxNpcs = 0;
    for (const spawnEvent of allSpawnEvents()) {
      const spawnEventMaxNpcs =
        this.maxSpawnEvents(spawnEvent.id) * spawnEventNpcCount(spawnEvent);

      npcCountTarget.set({ type: spawnEvent.name }, spawnEventMaxNpcs);

      maxNpcs += spawnEventMaxNpcs;
    }

    const maxSpawnEventsScale = Math.min(1, npcLimit() / maxNpcs);

    let anyAboveZero = false;
    const spawnSlotsRemainingFraction = allSpawnEvents().map((spawnEvent) => {
      if (spawnEventIdBlackList.includes(spawnEvent.id)) {
        // No spawn slots if we're blacklisted.
        return 0;
      }

      const anyNpcsAtMaxCount = (() => {
        for (const [npc, count] of spawnEvent.npcBag) {
          const maxCount = idToNpcType(npc).maxCount;
          if (
            maxCount !== undefined &&
            this.npcTracker.npcs(npc).size + count > maxCount
          ) {
            return true;
          }
        }
        return false;
      })();

      // No spawn slots if some of our NPCs are at max count.
      if (anyNpcsAtMaxCount) {
        return 0;
      }

      const maxSpawnEvents = Math.floor(
        this.maxSpawnEvents(spawnEvent.id) * maxSpawnEventsScale
      );

      const diff =
        maxSpawnEvents - this.npcTracker.spawnEvents(spawnEvent.id).size;
      if (diff > 0) {
        anyAboveZero = true;
        return diff / maxSpawnEvents;
      }
      return 0;
    });

    if (!anyAboveZero) {
      // Don't spawn more NPCs than the maximum.
      return;
    }

    return allSpawnEvents()[weightedRandomIndex(spawnSlotsRemainingFraction)];
  }

  private findSpawnPointForNpcType(
    spawnEventId: BiomesId,
    secondsSinceEpoch: number
  ) {
    if (!canSpawnAtTime(spawnEventId, secondsSinceEpoch)) {
      return;
    }

    // Find a candidate shard to look for spawn points within.
    const spawnShardId =
      this.npcSpawnContextBuilder.sampleCandidateSpawnPointShard(spawnEventId);
    if (spawnShardId === undefined) {
      return;
    }

    // Find the list of spawn point candidates within the selected shard.
    const spawnCandidates = this.resources.get(
      "/terrain/candidate_spawn_points",
      spawnShardId,
      spawnEventId
    );

    // Choose a spawn position.
    const spawnPosition = findSpawnEventPosition(spawnCandidates);
    if (spawnPosition === undefined) {
      log.info(
        "Former shard with spawn candidates no longer has candidates. Spawn attempt failed."
      );
      return;
    }

    // Make sure that it's not too close to other NPCs created by the
    // same spawn event.
    const spawnEvent = idToSpawnEvent(spawnEventId);
    if (spawnEvent.spawnConstraints.spawnEventMinDistance) {
      for (const nearbyNpc of this.table.metaIndex.npc_selector.scanSphere({
        center: spawnPosition,
        radius: spawnEvent.spawnConstraints.spawnEventMinDistance,
      })) {
        if (
          this.table.get(nearbyNpc)?.npc_metadata?.spawn_event_type_id ===
          spawnEventId
        ) {
          // Too close to another spawn event of the same type, reject.
          return;
        }
      }
    }

    // Make sure we don't spawn the NPC inside of a safe zone (candidate points
    // may already be filtered for some safe zone criteria).
    if (
      containsAggressiveNpcs(spawnEvent) &&
      isSafeZone(
        this.voxeloo,
        spawnPosition,
        this.table.metaIndex,
        this.resources
      )
    ) {
      // Don't spawn in a safe zone.
      return;
    }

    return spawnPosition;
  }

  private getNewSpawnParameters(
    secondsSinceEpoch: number
  ): { spawnEventId: BiomesId; position: Vec3 } | undefined {
    const spawnEventIdBlacklist: BiomesId[] = [];

    while (true) {
      const spawnEvent = this.chooseSpawnEventToTrigger(spawnEventIdBlacklist);
      if (spawnEvent === undefined) {
        return;
      }

      const position = this.findSpawnPointForNpcType(
        spawnEvent.id,
        secondsSinceEpoch
      );
      if (position) {
        return { spawnEventId: spawnEvent.id, position };
      }

      // Otherwise, add this NPC type to the blacklist and try again.
      spawnEventIdBlacklist.push(spawnEvent.id);
    }
  }

  private async spawnTick() {
    this.flushChanges();

    const now = secondsSinceEpoch();

    const numCurrentNpcs = this.npcTracker.npcs(undefined).size;
    if (numCurrentNpcs > npcLimit()) {
      if (this.logThrottleCount++ % 1000 === 0) {
        log.warn(
          `Not spawning an NPC because the number of current NPCs (${numCurrentNpcs}) is past the NPC limit (${npcLimit()}).`
        );
      }
      return;
    }

    const spawnInfo = this.getNewSpawnParameters(now);
    if (!spawnInfo) {
      return;
    }

    const { spawnEventId, position: spawnEventPosition } = spawnInfo;

    const spawnEvent = idToSpawnEvent(spawnEventId);
    log.debug(
      `Triggering spawn event "${
        spawnEvent.name
      }" at position: [${spawnEventPosition}]. Now managing ${
        this.npcTracker.spawnEvents(spawnEventId).size + 1
      } / ${this.maxSpawnEvents(spawnEventId)} of these spawn events.`
    );

    // Create NPCs in a circle around the spawn event position.
    const totalNpcCount = spawnEvent.npcBag.reduce(
      (acc, [_, count]) => acc + count,
      0
    );
    let npcsCreated = 0;
    const spawnCircumference = totalNpcCount * 6;
    const spawnRadius = spawnCircumference / (2 * Math.PI);
    const invNpcCount = 1 / totalNpcCount;
    const positionForIndex = (i: number) => {
      const angle = invNpcCount * i * Math.PI * 2;
      return add(spawnEventPosition, [
        Math.cos(angle) * spawnRadius,
        0,
        Math.sin(angle) * spawnRadius,
      ]);
    };

    const [spawnEventInstanceId, ...npcIds] = await this.idGenerator.batch(
      1 + totalNpcCount
    );

    const npcsToSpawn: NpcSpawnInfo[] = [];
    for (const [npcTypeId, count] of spawnEvent.npcBag) {
      for (let i = 0; i < count; ++i) {
        const npcType = idToNpcType(npcTypeId);
        const npcName = npcType.name;

        const position = positionForIndex(npcsCreated);
        const nextId = npcIds.pop();
        ok(nextId);
        npcsToSpawn.push({
          id: nextId,
          typeId: npcTypeId,
          position: position,
          spawnEvent:
            spawnEventId && spawnEventInstanceId
              ? {
                  id: spawnEventInstanceId,
                  typeId: spawnEventId,
                  position: spawnEventPosition,
                }
              : undefined,
        });

        npcsSpawned.inc({ type: npcName }, 1);

        ++npcsCreated;
        log.debug(
          `  Spawned a "${npcName}" at: ${position}. Now managing ${
            this.npcTracker.npcs(npcTypeId).size + npcsCreated
          } of this NPC type. (Now managing ${
            this.npcTracker.npcs(undefined).size
          }/${npcLimit()} total NPCs.)`
        );
      }
    }

    await this.applySpawnChangesAndAwaitUpdate(
      npcsToSpawn,
      spawnEventInstanceId,
      now
    );
  }

  private async applySpawnChangesAndAwaitUpdate(
    npcs: NpcSpawnInfo[],
    spawnEventInstanceId: BiomesId,
    secondsSinceEpoch: number
  ) {
    // Attach callback to NpcTracker for each NPC so that we can be notified
    // when we beomce aware that it's been created.
    const trackHooks = npcs.map((n) => {
      const latch = new Latch();
      return {
        hookId: this.npcTracker.addTrackHook(n.id, () => latch.signal()),
        latch,
      };
    });

    try {
      await this.worldApi.apply(
        makeSpawnChangeToApply(secondsSinceEpoch, ...npcs)
      );
    } catch (error) {
      log.error("Error response while spawning NPC from world server: ", {
        error,
      });
      // Continue onward despite the error, the subsequent code will timeout,
      // rate limiting the error request for us.
    }
    const SPAWN_TIMEOUT_MS = 30000;

    // Wait for all callbacks to be called, or a timeout to trigger.
    const results = await Promise.any([
      Promise.all(trackHooks.map((x) => x.latch.wait())),
      setTimeout(SPAWN_TIMEOUT_MS, undefined),
    ]);

    if (results === undefined) {
      log.error(
        `Timed out waiting ${SPAWN_TIMEOUT_MS}ms for spawn event (id: ${spawnEventInstanceId}) to be reflected in list of tracked NPCs.`
      );
    }

    // Remove all callbacks and return.
    for (const trackHook of trackHooks) {
      this.npcTracker.removeTrackHook(trackHook.hookId);
    }
  }
}

function npcLimit() {
  return CONFIG.animaGlobalSpawnLimit;
}
