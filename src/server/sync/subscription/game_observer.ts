import { newPlayer } from "@/server/logic/utils/players";
import { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import {
  lazyChangeToSerialized,
  mergeLazyChange,
} from "@/server/shared/ecs/lazy";
import type { Firehose } from "@/server/shared/firehose/api";
import type { WorldApi } from "@/server/shared/world/api";
import { WrappedSyncChangeFor } from "@/server/sync/subscription/encoder";
import type { Scanner } from "@/server/sync/subscription/scanner";
import type {
  EntityClass,
  EntityKnowledge,
  SyncIndex,
} from "@/server/sync/subscription/sync_index";
import type {
  SyncChange,
  SyncTarget,
  WrappedSyncChange,
} from "@/shared/api/sync";
import type { Delete } from "@/shared/ecs/change";
import { changedBiomesId } from "@/shared/ecs/change";
import { SyntheticStats } from "@/shared/ecs/gen/components";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { SerializeForClient } from "@/shared/ecs/gen/json_serde";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { VersionMap } from "@/shared/ecs/version";
import { friendlyShardId } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { lengthSq, sub } from "@/shared/math/linear";
import { createCounter } from "@/shared/metrics/metrics";
import { mapSet } from "@/shared/util/collections";
import { getNowMs } from "@/shared/util/helpers";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { render } from "prettyjson";

export type Emitter = (events: SyncChange[]) => void;

function baseSyncPriority(entityClass?: EntityClass) {
  switch (entityClass) {
    case "player":
      return 2;
    case "terrain":
      return 1;
  }
  return 2;
}

type LazySyncChange = LazyChange | BiomesId;

class SyncChangeBuffer {
  private readonly changes = new Map<BiomesId, LazySyncChange>();

  get size() {
    return this.changes.size;
  }

  get empty() {
    return this.size === 0;
  }

  clear() {
    this.changes.clear();
  }

  pop(): LazySyncChange[] {
    const result = Array.from(this.changes.values());
    this.changes.clear();
    return result;
  }

  push(changes: ReadonlyArray<LazySyncChange>) {
    for (const change of changes) {
      if (typeof change === "number") {
        this.changes.set(change, change);
        continue;
      }
      const id = changedBiomesId(change);
      const prior = this.changes.get(id);
      if (typeof prior === "number") {
        continue;
      }
      this.changes.set(id, mergeLazyChange(prior, change));
    }
  }

  delete(id: BiomesId) {
    this.changes.delete(id);
  }

  [Symbol.iterator]() {
    return this.changes[Symbol.iterator]();
  }
}

const syncEmittedChanges = createCounter({
  name: "sync_emitted_changes",
  help: "Number of changes emitted by the sync system",
  labelNames: ["type"],
});

const syncEmittedBootstraps = createCounter({
  name: "sync_emitted_bootstraps",
  help: "Number of changes emitted by the sync system",
  labelNames: ["type"],
});

const syncObserverStarts = createCounter({
  name: "sync_observer_starts",
  help: "Number of observers that have been started",
});

const syncObserverInitialVmSize = createCounter({
  name: "sync_observer_initial_vm_size",
  help: "Initial size of the version map for observers",
});

function requiredForSyncTarget(syncTarget: SyncTarget): BiomesId | undefined {
  switch (syncTarget.kind) {
    case "localUser":
      return syncTarget.userId;
    case "entity":
      return syncTarget.entityId;
    default:
      return undefined;
  }
}

export class Observer {
  // Entities we have recorded appropriately for the client, so lags reality.
  private readonly residentSet: Set<BiomesId> = new Set();
  private readonly changeBuffer = new SyncChangeBuffer();
  private readonly lastSyncTimes = new Map<BiomesId, number>();
  private readonly target: SerializeForClient;
  private readonly requiredId: BiomesId;

  constructor(
    private readonly context: {
      worldApi: WorldApi;
      syncIndex: SyncIndex;
      firehose: Firehose;
    },
    private readonly syncTarget: SyncTarget,
    // List of all entities the client knows of, along with their last known
    // versions.
    private readonly versionMap: VersionMap,
    private readonly scanner: Scanner
  ) {
    this.target = {
      whoFor: "client",
      id:
        syncTarget.kind === "localUser" ? syncTarget.userId : INVALID_BIOMES_ID,
    };

    this.requiredId = requiredForSyncTarget(syncTarget) ?? INVALID_BIOMES_ID;
    if (this.requiredId) {
      this.residentSet.add(this.requiredId);
    }
    syncObserverStarts.inc();
    syncObserverInitialVmSize.inc(this.versionMap.size);
    this.purgeUnknownEntities();
  }

  get residentSetSize() {
    return this.residentSet.size;
  }

  get pendingChanges() {
    return this.changeBuffer.size;
  }

  private async requiredChanges(): Promise<SyncChange[]> {
    const [[metaVersion, lazyMeta], maybeRequired] =
      await this.context.worldApi.getWithVersion([
        WorldMetadataId,
        ...(this.requiredId ? [this.requiredId] : []),
      ]);
    ok(lazyMeta, "World metadata not found");

    const meta = {
      ...lazyMeta.materialize(),
      synthetic_stats: SyntheticStats.create({
        online_players: this.context.syncIndex.playerCount,
      }),
    };
    const ret: SyncChange[] = [
      {
        kind: "update",
        tick: metaVersion,
        entity: meta,
      },
    ];
    this.versionMap.set(WorldMetadataId, metaVersion);

    switch (this.syncTarget.kind) {
      case "position":
        break;

      case "entity":
        {
          const entity = maybeRequired;
          if (!entity[1]) {
            entity[0] = 1;
            const fakePlayer = newPlayer(this.requiredId, "FakePlayer");
            entity[1] = LazyEntity.forDecoded(fakePlayer);
            log.warn("Could not find required entity for sync, synthesizing", {
              id: fakePlayer.id,
              position: fakePlayer.position?.v,
            });
          }

          this.versionMap.set(this.requiredId, entity[0]);
          ret.push({
            kind: "update",
            tick: entity[0],
            entity: entity[1].materialize(),
          });
        }
        break;

      case "localUser":
        {
          const player = maybeRequired;
          const userId = this.syncTarget.userId;
          if (!player[1]) {
            // We didn't find the player entity, but we know where it'll probably start.
            // So send that much information to help them get into the world smoothly.
            player[0] = 1;
            const fakePlayer = newPlayer(userId, "Player");
            player[1] = LazyEntity.forDecoded(fakePlayer);
            log.warn("Could not find player for sync, synthesizing", {
              id: fakePlayer.id,
              position: fakePlayer.position?.v,
            });
          } else if (player[1].hasIced()) {
            // We did find the player, but they may have been iced. We know this will
            // stop being the case so de-ice the update we send down.
            player[1] = LazyEntity.forDecoded({
              ...(player[1].materialize() as Entity),
              iced: undefined,
            });
            log.warn("Pre-emptively de-icing player for sync", {
              id: userId,
            });
          }
          this.versionMap.set(userId, player[0]);
          ret.push({
            kind: "update",
            tick: player[0],
            entity: player[1].materialize(),
          });
        }
        break;
      default:
        assertNever(this.syncTarget);
        throw new Error("Unreachable");
    }

    return ret;
  }

  async start(): Promise<WrappedSyncChange[]> {
    log.info(
      `${render(this.syncTarget)}: Starting observer updates with ${
        this.versionMap.size
      } known entities`
    );

    // Get the required core changes, do this before using the scanner
    // to not double-up on the metadata and player.
    const required = await this.requiredChanges();

    // Generate any initial changes we're aware of and setup the hooks.
    this.scanner.on("delta", this.update);
    this.update(
      [],
      new Map(mapSet(this.scanner.residentSet, (id) => [id, true]))
    );

    return required.map(
      (change) => new WrappedSyncChangeFor(this.target, change)
    );
  }

  stop() {
    this.scanner.off("delta", this.update);
  }

  private rankChange(
    selfKnowledge: EntityKnowledge | undefined,
    now: number,
    id: BiomesId,
    change: LazySyncChange
  ): number | undefined {
    if (id === this.requiredId) {
      return 0;
    }
    if (typeof change === "number") {
      // Bootstraps are more important.
      return 2;
    }
    if (change.kind === "delete") {
      // Prioritize cleaning out things.
      return 1;
    }

    const knowledge = this.context.syncIndex.getKnowledge(id);
    const lastSyncTime = this.lastSyncTimes.get(id) ?? 0;

    const timeSinceLastSync = now - (lastSyncTime ?? 0);
    if (knowledge?.entityClass === "player") {
      // Lower the sync rate of other players.
      if (timeSinceLastSync < CONFIG.syncPlayerUpdateRateMs) {
        // Too soon an update, lets just forget it entirely.
        return undefined;
      }
    }
    let spatialScore = 0;
    if (selfKnowledge?.position && knowledge?.position) {
      const rel = sub(knowledge?.position, selfKnowledge?.position);
      const d2 = lengthSq(rel);
      if (
        CONFIG.syncOutsideRadiusUpdateRateMs &&
        d2 > this.scanner.radius * this.scanner.radius
      ) {
        if (timeSinceLastSync < CONFIG.syncOutsideRadiusUpdateRateMs) {
          return undefined;
        }
      }
      spatialScore = d2 * CONFIG.syncDistanceBias;
    }
    return (
      baseSyncPriority(knowledge?.entityClass) +
      Math.exp(-timeSinceLastSync) * (1 + spatialScore)
    );
  }

  pull(count: number): WrappedSyncChange[] {
    if (this.changeBuffer.empty) {
      return [];
    }
    const now = getNowMs();
    const selfKnowledge = this.context.syncIndex.getKnowledge(this.requiredId);

    const ranked: [number, BiomesId, LazySyncChange][] = [];
    for (const [key, value] of this.changeBuffer) {
      const rank = this.rankChange(selfKnowledge, now, key, value);
      if (rank === undefined) {
        continue;
      }
      ranked.push([rank, key, value]);
    }
    ranked.sort((a, b) => b[0] - a[0]);

    const batch: WrappedSyncChange[] = [];
    for (const [_, id, change] of ranked) {
      batch.push(
        (typeof change === "number"
          ? change
          : lazyChangeToSerialized(this.target, change)) as WrappedSyncChange
      );
      this.changeBuffer.delete(id);
      const type =
        this.context.syncIndex.getKnowledge(id)?.entityClass ?? "unknown";
      if (typeof change === "number") {
        syncEmittedBootstraps.inc({ type });
      } else {
        syncEmittedChanges.inc({ type });
      }
      if (typeof change === "number" || change.kind !== "delete") {
        this.lastSyncTimes.set(
          id,
          now + (Math.random() - 0.5) * 2 * CONFIG.syncEntityJitter
        );
      } else {
        this.lastSyncTimes.delete(id);
      }
      if (batch.length >= count) {
        break;
      }
    }
    return batch;
  }

  private maybeLogTerrainDelete(
    tick: number,
    entityId: BiomesId,
    why: string,
    additional?: {}
  ) {
    if (process.env.DEBUG_TERRAIN_DELETION !== "1") {
      return;
    }
    if (!this.target.id) {
      return;
    }
    const knowledge = this.context.syncIndex.getKnowledge(entityId);
    if (knowledge?.entityClass !== "terrain") {
      return;
    }
    const playerPos = this.context.syncIndex.getKnowledge(
      this.target.id
    )?.position;
    log.info("Sending terrain delete to client", {
      userId: this.target.id,
      entityId,
      playerPos: playerPos ?? "uknown",
      shard: knowledge.bucket ? friendlyShardId(knowledge.bucket) : "unknown",
      tick,
      why,
      ...additional,
    });
  }

  private changesForResidentSetDelta(
    delta: Map<BiomesId, boolean>
  ): LazySyncChange[] {
    const relevantChanges: LazySyncChange[] = [];

    // Handle items that have entered or left the resident set.
    for (const [id, added] of delta) {
      if (this.requiredId === id) {
        // No need to handle resident set for self.
        continue;
      }

      if (added) {
        if (this.residentSet.has(id)) {
          // Nothing to do if this entity is already in the resident set. This
          // case might arise if entities are moving between buckets (e.g.
          // removed from one and added to another).
          continue;
        }

        this.residentSet.add(id);

        const clientVersion = this.versionMap.get(id);
        const serverVersion = this.context.syncIndex.getKnowledge(id)?.version;

        if (serverVersion === undefined) {
          // It is deleted (or iced), erase it on the client if they had it.
          if (clientVersion !== undefined) {
            relevantChanges.push({
              kind: "delete",
              tick: clientVersion,
              id,
            });
            this.maybeLogTerrainDelete(clientVersion, id, "no server version");
          }
        } else if (
          clientVersion === undefined ||
          clientVersion < serverVersion
        ) {
          relevantChanges.push(id);
        }
      } else {
        // Note, we don't pro-actively delete the content from the client, this
        // is done just in case the item becomes relevant again- so the client can
        // avoid re-syncing it.
        // It will be deleted either:
        // - by onTick if it changes and is not in resident set but in client
        // - by maybePurgeVersionMap if the client versions gets too large.
        this.residentSet.delete(id);
      }
    }
    return relevantChanges;
  }

  private changesInResidentSet(changes: LazyChange[]) {
    const relevantChanges: LazySyncChange[] = [];

    for (const change of changes) {
      if (change.kind === "delete") {
        if (change.id === this.requiredId) {
          // Just ignore deletes for self
          log.warn(
            `Sync server ignoring delete for self: ${render(this.syncTarget)}`
          );
          continue;
        }
        // We care about deletion events even if they're not in our resident
        // set, since the entities may still exist in the client's version
        // map.
        if (this.versionMap.has(change.id)) {
          relevantChanges.push(change);
          this.maybeLogTerrainDelete(change.tick, change.id, "direct deletion");
        }
        continue;
      }

      const id = change.entity.id;
      if (id === this.requiredId) {
        relevantChanges.push(change);
        continue;
      }
      if (!this.residentSet.has(id)) {
        const clientVersion = this.versionMap.get(id);
        if (clientVersion) {
          // If an entity is updated outside of the client's resident set,
          // then just delete it since it means that we know that the client's
          // version of the entity is now old, and we don't care to keep it
          // up-to-date.
          relevantChanges.push({ kind: "delete", tick: clientVersion, id });
          this.maybeLogTerrainDelete(
            clientVersion,
            id,
            "updated outside resident set",
            {
              residentSet: Array.from(this.residentSet),
            }
          );
        }
        // If the client isn't near this entity, they don't need to know
        // about updates to it.
        continue;
      }
      // Keep the change if our client doesn't already have if up-to-date.
      if ((this.versionMap.get(id) ?? 0) > change.tick) {
        continue;
      }
      relevantChanges.push(change);
    }
    return relevantChanges;
  }

  private updateVersionMap(changes: LazySyncChange[]) {
    // Update our client version map according to the incoming changes, so that
    // we can track what the client will eventually see.
    for (const change of changes) {
      if (typeof change === "number") {
        const knowledge = this.context.syncIndex.getKnowledge(change);
        if (!knowledge) {
          this.versionMap.delete(change);
        } else {
          this.versionMap.set(change, knowledge.version ?? 1);
        }
        continue;
      }
      switch (change.kind) {
        case "delete":
          this.versionMap.delete(change.id);
          break;
        case "create":
        case "update":
          this.versionMap.set(change.entity.id, change.tick);
          break;
      }
    }
  }

  update = (changes: LazyChange[], delta: Map<BiomesId, boolean>) => {
    // Handle the resident set first, so the changes are appropriately filtered.
    const relevantChanges = [
      ...this.changesForResidentSetDelta(delta),
      ...this.changesInResidentSet(changes),
    ];

    if (relevantChanges.length === 0) {
      return;
    }

    this.updateVersionMap(relevantChanges);
    this.maybePurgeVersionMap();
    this.changeBuffer.push(relevantChanges);
  };

  // If the this.versionMap is too big, purge it down to size, modifying it
  // in place and also pushing the delete changes to this.TickChangeBuffer.
  private maybePurgeVersionMap() {
    if (this.versionMap.size <= CONFIG.syncVersionMapMaxSize) {
      return;
    }

    // Purge the version map down to half its size.
    // But ensure it can fit the current resident set.
    const targetPurgedSize = Math.max(
      CONFIG.syncVersionMapMaxSize / 2,
      this.residentSet.size
    );
    const toPurgeCount = this.versionMap.size - targetPurgedSize;
    if (toPurgeCount <= 0) {
      return;
    }

    const purgeChanges: Delete[] = [];
    for (const [id, clientVersion] of this.versionMap) {
      if (purgeChanges.length >= toPurgeCount) {
        break;
      }
      if (!this.residentSet.has(id)) {
        this.versionMap.delete(id);
        purgeChanges.push({ kind: "delete", tick: clientVersion, id });
        this.maybeLogTerrainDelete(clientVersion, id, "version map purge");
      }
    }
    this.changeBuffer.push(purgeChanges);
  }

  // Remove anything that we don't know about.
  private purgeUnknownEntities() {
    const purgeChanges: Delete[] = [];
    for (const [id, clientVersion] of this.versionMap) {
      if (id === this.requiredId) {
        continue;
      }
      if (!this.context.syncIndex.has(id)) {
        this.versionMap.delete(id);
        purgeChanges.push({ kind: "delete", tick: clientVersion, id });
        this.maybeLogTerrainDelete(clientVersion, id, "unknown purge");
      }
    }
    this.changeBuffer.push(purgeChanges);
  }
}
