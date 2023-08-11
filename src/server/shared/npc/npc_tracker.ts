import type { ReadonlyNpcMetadata } from "@/shared/ecs/gen/components";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { idToNpcType, isSpawnEventId } from "@/shared/npc/bikkie";
import { DefaultMap } from "@/shared/util/collections";
import { ok } from "assert";

export type TrackHook = BiomesId;

export class NpcTracker {
  private _npcs = new DefaultMap<BiomesId, Set<BiomesId>>(
    () => new Set<BiomesId>()
  );
  private _spawnEvents = new DefaultMap<
    BiomesId,
    DefaultMap<BiomesId, Set<BiomesId>>
  >(() => new DefaultMap<BiomesId, Set<BiomesId>>(() => new Set<BiomesId>()));
  private reverseLookup = new Map<BiomesId, ReadonlyNpcMetadata>();
  readonly allNpcs = new Set<BiomesId>();

  // Notifications for when we start tracking certain Ids.
  private trackHooks = new Map<BiomesId, () => void>();

  constructor(private options?: { noLogging?: {} }) {}

  npcs(npcType: BiomesId | undefined): Set<BiomesId> {
    if (npcType === undefined) {
      return this.allNpcs;
    } else {
      return this._npcs.get(npcType);
    }
  }

  spawnEvents(id: BiomesId) {
    return this._spawnEvents.get(id);
  }

  trackNpc(id: BiomesId, npcMetadata: ReadonlyNpcMetadata) {
    if (!this.options?.noLogging) {
      log.debug(
        `Tracking new "${
          idToNpcType(npcMetadata.type_id).name
        }" NPC (id: "${id}") (out of ${
          this._npcs.get(npcMetadata.type_id)?.size
        }): ${JSON.stringify(npcMetadata)}`
      );
    }

    this.npcs(npcMetadata.type_id).add(id);
    this.reverseLookup.set(id, npcMetadata);
    this.allNpcs.add(id);

    if (isSpawnEventId(npcMetadata.spawn_event_type_id)) {
      const spawnEventNpcs = this.spawnEvents(
        npcMetadata.spawn_event_type_id
      ).get(npcMetadata.spawn_event_id ?? INVALID_BIOMES_ID);
      spawnEventNpcs.add(id);
    } else if (npcMetadata.spawn_event_type_id) {
      log.warn(
        `Unknown spawn event type id: ${npcMetadata.spawn_event_type_id} on NPC ${id}`
      );
    }

    const trackHook = this.trackHooks.get(id);
    if (trackHook) {
      trackHook();
    }
  }
  untrackNpc(id: BiomesId) {
    const npcMetadata = this.reverseLookup.get(id);
    if (!npcMetadata) {
      // Not an NPC.
      return;
    }
    if (!this.options?.noLogging) {
      log.debug(
        `Untracking NPC (id: "${id}") "${
          idToNpcType(npcMetadata.type_id).name
        }" NPC (out of ${
          this._npcs.get(npcMetadata.type_id)?.size
        }): ${JSON.stringify(npcMetadata)}`
      );
    }

    this.reverseLookup.delete(id);
    this.npcs(npcMetadata.type_id).delete(id);
    this.allNpcs.delete(id);

    const spawnEventsForType =
      isSpawnEventId(npcMetadata.spawn_event_type_id) &&
      this.spawnEvents(npcMetadata.spawn_event_type_id);
    if (spawnEventsForType) {
      const spawnEventNpcs = spawnEventsForType.get(
        npcMetadata.spawn_event_id ?? INVALID_BIOMES_ID
      );
      if (spawnEventNpcs) {
        spawnEventNpcs.delete(id);
        if (spawnEventNpcs.size === 0) {
          spawnEventsForType.delete(
            npcMetadata.spawn_event_id ?? INVALID_BIOMES_ID
          );
        }
      }
    }
  }

  addTrackHook(id: BiomesId, callback: () => void): TrackHook {
    ok(!this.trackHooks.has(id));
    this.trackHooks.set(id, callback);
    return id;
  }

  removeTrackHook(hook: TrackHook) {
    const id: BiomesId = hook;

    ok(this.trackHooks.has(id));
    this.trackHooks.delete(id);
  }
}
