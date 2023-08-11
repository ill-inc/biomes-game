import type { GardenHose } from "@/client/events/api";
import type { ClientContext } from "@/client/game/context";
import type { ClientCache } from "@/client/game/context_managers/client_cache";
import type { Events } from "@/client/game/context_managers/events";
import type { ClientTable } from "@/client/game/game";
import type {
  NavigationAid,
  NavigationAidSpec,
} from "@/client/game/helpers/navigation_aids";
import type { ClientResources } from "@/client/game/resources/types";
import { cleanEmitterCallback } from "@/client/util/helpers";
import { useInvalidate } from "@/client/util/hooks";
import {
  getTypedStorageItem,
  setTypedStorageItem,
} from "@/client/util/typed_local_storage";
import type { NPCLocationsByTypeResponse } from "@/pages/api/world_map/npc_locations_by_type";
import { RemoveMapBeamEvent } from "@/shared/ecs/gen/events";
import { playerAABB } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { dist2, xzProject, xzUnproject } from "@/shared/math/linear";
import type {
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
  Vec3,
} from "@/shared/math/types";
import { idToNpcType } from "@/shared/npc/bikkie";
import type { RegistryLoader } from "@/shared/registry";
import type { WorldMapMetadataResponse } from "@/shared/types";
import { fireAndForget } from "@/shared/util/async";
import { firstSetValue } from "@/shared/util/collections";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import {
  entityPositionOrBoxCenter,
  pathWithQuery,
} from "@/shared/util/helpers";
import { EventThrottle } from "@/shared/util/throttling";
import { assertNever } from "@/shared/util/type_helpers";
import { EventEmitter } from "events";
import { first } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import type TypedEventEmitter from "typed-emitter";

export type MapManagerEvents = {
  onMapMetadataUpdated: () => unknown;
  onPlayerTrackingUpdated: () => unknown;
  onQuestTrackingUpdated: () => unknown;
  onNavigationAidsUpdated: () => unknown;
};

export class ReactMapManager {
  constructor(private mapManager: MapManager) {}

  useMapMetadata(): [boolean, WorldMapMetadataResponse | undefined] {
    const [_, setVersion] = useState(0);
    const currentVersion = useRef(0);
    const [loading, setLoading] = useState<boolean>(
      this.mapManager.isLoadingMetadata()
    );
    useEffect(
      () =>
        cleanEmitterCallback(this.mapManager.emitter, {
          onMapMetadataUpdated: () => {
            currentVersion.current += 1;
            setVersion(currentVersion.current);
            setLoading(this.mapManager.isLoadingMetadata());
          },
        }),
      []
    );

    return [loading, this.mapManager.mapMetadata];
  }

  useTrackingPlayerStatus(id: BiomesId) {
    const [isTracking, setIsTracking] = useState(
      this.mapManager.isTrackingPlayer(id)
    );
    useEffect(
      () =>
        cleanEmitterCallback(this.mapManager.emitter, {
          onPlayerTrackingUpdated: () => {
            setIsTracking(this.mapManager.isTrackingPlayer(id));
          },
        }),
      []
    );

    return [
      isTracking,
      (beam: boolean) => {
        this.mapManager.setTrackingPlayer(id, beam);
      },
    ] as const;
  }

  useTrackingQuestStatus(id: BiomesId | undefined) {
    const [trackedId, setTrackedId] = this.useTrackedQuestId();
    return [
      id === trackedId,
      (tracked: boolean) => setTrackedId(tracked ? id : undefined),
    ] as const;
  }

  useTrackedQuestId() {
    const [trackedQuest, setTrackedQuest] = useState(
      this.mapManager.trackingQuestId
    );

    useEffect(
      () =>
        cleanEmitterCallback(this.mapManager.emitter, {
          onQuestTrackingUpdated: () => {
            setTrackedQuest(
              this.mapManager.trackingQuestId ?? INVALID_BIOMES_ID
            );
          },
        }),
      []
    );

    return [
      trackedQuest,
      (newId: BiomesId | undefined) => {
        this.mapManager.trackingQuestId = newId;
      },
    ] as const;
  }

  useNavigationAids() {
    const invalidate = useInvalidate();
    const updateBeams = useCallback(() => {
      invalidate();
    }, []);

    useEffect(
      () =>
        cleanEmitterCallback(this.mapManager.emitter, {
          onNavigationAidsUpdated: updateBeams,
        }),
      []
    );

    return this.mapManager.localNavigationAids;
  }
}

async function fetchNpcLocations(clientCache: ClientCache, typeId: BiomesId) {
  return clientCache.getOrCompute(
    1 * 60,
    "npcTypeLocation",
    typeId,
    async () => {
      const ret = await jsonFetch<NPCLocationsByTypeResponse>(
        pathWithQuery("/api/world_map/npc_locations_by_type", {
          typeId: typeId,
        })
      );
      return ret.npcLocations.map((e) => e[1]);
    }
  );
}

export class MapManager {
  static BEAM_REMOVAL_THROTTLE_MS = 1000 * 20;
  static EXPIRE_BEAMS_TICK_TIME = 1000;
  static METADATA_TICK_TIME = 10 * 60 * 1000; // 10min
  static EAGER_METADATA_TICK_TIME = 1 * 60 * 1000; // 1min
  static TICK_INTERVAL = Math.min(
    this.EXPIRE_BEAMS_TICK_TIME,
    this.METADATA_TICK_TIME
  );
  static MIN_BEAM_DISTANCE = 10;

  emitter = new EventEmitter() as TypedEventEmitter<MapManagerEvents>;

  private metadataTickThrottle = new EventThrottle(
    MapManager.METADATA_TICK_TIME
  );
  private eagerMetadataThrottle = new EventThrottle(
    MapManager.EAGER_METADATA_TICK_TIME
  );
  private tickInterval?: ReturnType<typeof setInterval>;
  private sentBeamRemovalsForNavigationAidIds: Map<number, number> = new Map();

  trackingPlayerIds: Set<BiomesId> = new Set();
  _trackingQuestId: BiomesId | undefined = undefined;
  navigationAidCounter = 0;
  localNavigationAids = new Map<number, NavigationAid>();

  react = new ReactMapManager(this);
  isRequestingMetadata?: boolean;

  lastExpireBeamsTick?: number;
  isTickingQuest?: boolean;

  mapMetadata?: WorldMapMetadataResponse;
  private cleanUps: Array<() => unknown> = [];

  constructor(
    private userId: BiomesId,
    private clientCache: ClientCache,
    private resources: ClientResources,
    private table: ClientTable,
    private events: Events,
    private gardenHose: GardenHose
  ) {
    this.emitter.setMaxListeners(100);
    this.tick();
  }

  hotHandoff(old: MapManager) {
    this.emitter = old.emitter;
    this.mapMetadata = old.mapMetadata;
    old.stop();
  }

  start() {
    if (!this.tickInterval) {
      this.tickInterval = setInterval(
        () => this.tick(),
        MapManager.TICK_INTERVAL
      );
      this.tick();
    }

    this.cleanUps.push(
      cleanEmitterCallback(this.gardenHose, {
        challenge_unlock: (ev) => {
          this.trackingQuestId = ev.id;
        },
        challenge_complete: () => {
          this.setTrackingDefault();
        },
        challenge_abandon: () => {
          this.setTrackingDefault();
        },
      })
    );
    this.setTrackingDefault();
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }

    for (const cleanUp of this.cleanUps) {
      cleanUp();
    }

    this.cleanUps = [];
  }

  navAidPositionForChallengeId(challengeId: BiomesId) {
    for (const [_s, v] of this.localNavigationAids) {
      if (v.challengeId == challengeId) {
        return v.pos;
      }
    }
  }

  get trackingQuestId() {
    return this._trackingQuestId;
  }
  set trackingQuestId(newId: BiomesId | undefined) {
    if (newId === this._trackingQuestId) {
      return;
    }

    this._trackingQuestId = newId;
    this.emitter.emit("onQuestTrackingUpdated");
    setTypedStorageItem("tracked_quest", newId ? newId : INVALID_BIOMES_ID);
  }

  setTrackingDefault() {
    const inProgress = this.resources.get(
      "/ecs/c/challenges",
      this.userId
    )?.in_progress;
    const savedTrackedQuest =
      getTypedStorageItem("tracked_quest") ?? INVALID_BIOMES_ID;

    const oldTrack = this.trackingQuestId;
    if (oldTrack && inProgress?.has(oldTrack)) {
      return;
    }

    if (inProgress?.has(savedTrackedQuest)) {
      this.trackingQuestId = savedTrackedQuest;
    } else if (inProgress && inProgress?.size > 0) {
      this.trackingQuestId = firstSetValue(inProgress);
    } else {
      this.trackingQuestId = undefined;
    }
  }

  isTrackingQuest(challengeId?: BiomesId) {
    return challengeId
      ? this.trackingQuestId === challengeId
      : !!this.trackingQuestId;
  }

  isLoadingMetadata(): boolean {
    return this.isRequestingMetadata ?? false;
  }

  isTrackingPlayer(playerId: BiomesId) {
    return this.trackingPlayerIds.has(playerId);
  }

  setTrackingPlayer(playerId: BiomesId, on = true) {
    if (on && !this.trackingPlayerIds.has(playerId)) {
      this.trackingPlayerIds.add(playerId);
      this.emitter.emit("onPlayerTrackingUpdated");
    } else if (!on && this.trackingPlayerIds.has(playerId)) {
      this.trackingPlayerIds.delete(playerId);
      const player = this.resources.get("/sim/player", playerId);
      if (player) {
        const otherPlayerPos2d: Vec2 = [player.position[0], player.position[2]];
        this.gardenHose.publish({
          kind: "beam_dismiss",
          beamType: "player",
          beamLocation: otherPlayerPos2d,
        });
      }
      this.emitter.emit("onPlayerTrackingUpdated");
    }
  }

  private setNavigationAidForId(beam: NavigationAid) {
    const playerPos = this.resources.get("/scene/local_player").player.position;
    if (
      beam.autoremoveWhenNear &&
      dist2([beam.pos[0], beam.pos[2]], [playerPos[0], playerPos[2]]) <
        MapManager.MIN_BEAM_DISTANCE
    ) {
      return;
    }

    this.localNavigationAids.set(beam.id, beam);
    this.emitter.emit("onNavigationAidsUpdated");
  }

  addNavigationAid(aid: NavigationAidSpec, id?: number) {
    id ??= this.navigationAidCounter++;

    let position: ReadonlyVec3 = [0, 0, 0];
    switch (aid.target.kind) {
      case "npc":
        const beamPos = idToNpcType(aid.target.typeId).behavior.questGiver
          ?.beamPosition;
        // Fallback if server doesn't respond properly
        if (beamPos) {
          position = beamPos;
        }
        void fetchNpcLocations(this.clientCache, aid.target.typeId)
          .then((positions) => {
            const pos = first(positions);
            if (pos && this.localNavigationAids.has(id!)) {
              const posCopy: Vec3 = [...pos];
              const anchor = playerAABB(posCopy);
              posCopy[1] = anchor[1][1];
              this.setNavigationAidForId({
                id: id!,
                pos: posCopy,
                ...aid,
              });
            }
          })
          .catch((error: any) => {
            log.error("Error while fetching npc location", { error });
          });
        break;
      case "pos2d":
        position = xzUnproject(aid.target.position);
        break;
      case "position":
        position = [...aid.target.position];
        break;
      case "entity":
      case "robot":
        const entityId = aid.target.id;
        this.table.oob
          .oobFetchSingle(entityId)
          .then((entity) => {
            if (!entity) {
              log.prodError("No entity found for navigation aid", {
                entityId,
              });
              return;
            }
            const pos = entity.position?.v ?? position;
            const size = entity.size?.v ?? [0, 0, 0];
            this.setNavigationAidForId({
              ...aid,
              id: id!,
              pos: [pos[0], pos[1] + size[1], pos[2]],
            });
          })
          .catch((error: any) => {
            log.error("Error fetching entity", { error });
            if (this.localNavigationAids.has(id!)) {
              this.removeNavigationAid(id!);
            }
          });
        break;
      case "group":
        this.table.oob
          .oobFetchSingle(aid.target.groupId)
          .then((group) => {
            if (!group) {
              log.error("Not existing group for navigation aid", {
                groupId: aid.target.kind === "group" && aid.target.groupId,
              });
              return;
            }

            const pos = entityPositionOrBoxCenter(group, position);

            this.setNavigationAidForId({
              ...aid,
              id: id!,
              pos: pos,
            });
          })
          .catch((error: any) => {
            log.error("Error fetching group", { error });

            if (this.localNavigationAids.has(id!)) {
              this.removeNavigationAid(id!);
            }
          });
        break;
      default:
        assertNever(aid.target);
    }

    this.setNavigationAidForId({
      id,
      pos: position,
      ...aid,
    });
    return id;
  }

  removeNavigationAid(id: number) {
    const data = this.localNavigationAids.get(id);
    if (data === undefined) {
      return;
    }

    this.localNavigationAids.delete(id);
    fireAndForget(
      this.events.publish(
        new RemoveMapBeamEvent({
          id: this.userId,
          beam_client_id: data.id,
          beam_location: xzProject(data.pos),
        })
      )
    );
    this.gardenHose.publish({
      kind: "beam_dismiss",
      beamType: "navigation",
      beamLocation: xzProject(data.pos),
    });
    this.emitter.emit("onNavigationAidsUpdated");
  }

  loadMapMetadata() {
    if (this.eagerMetadataThrottle.testAndSet()) {
      void this.tickMapMetadata();
    }
  }

  private tick() {
    if (this.metadataTickThrottle.testAndSet()) {
      void this.tickMapMetadata();
    }

    if (
      !this.lastExpireBeamsTick ||
      performance.now() - this.lastExpireBeamsTick >
        MapManager.EXPIRE_BEAMS_TICK_TIME
    ) {
      void this.tickExpireNavigationAids();
    }
  }

  private async tickMapMetadata() {
    if (this.isRequestingMetadata) {
      return;
    }

    try {
      this.isRequestingMetadata = true;
      this.mapMetadata = await jsonFetch<WorldMapMetadataResponse>(
        "/api/world_map/metadata"
      );
      this.emitter.emit("onMapMetadataUpdated");
    } catch (error: any) {
      log.error("Error while requesting map metadata", { error });
    } finally {
      this.isRequestingMetadata = false;
      this.metadataTickThrottle.reset();
      this.eagerMetadataThrottle.reset();
    }
  }

  private tickExpireNavigationAids() {
    const localPlayer = this.resources.get("/scene/local_player");
    const pos2d: ReadonlyVec2 = [
      localPlayer.player.position[0],
      localPlayer.player.position[2],
    ];
    const pos2WithinReach = (pos: ReadonlyVec2) =>
      dist2(pos, pos2d) < MapManager.MIN_BEAM_DISTANCE;

    const posWithinReach = (pos: ReadonlyVec3) =>
      pos2WithinReach([pos[0], pos[2]]);

    const sendRemoveBeamThrottledWithId = (id: number, pos: ReadonlyVec2) => {
      if (
        performance.now() -
          (this.sentBeamRemovalsForNavigationAidIds.get(id) ?? 0) >
        MapManager.BEAM_REMOVAL_THROTTLE_MS
      ) {
        this.sentBeamRemovalsForNavigationAidIds.set(id, performance.now());
        fireAndForget(
          this.events.publish(
            new RemoveMapBeamEvent({
              id: localPlayer.id,
              beam_client_id: id,
              beam_location: [...pos],
            })
          )
        );
      }
    };

    for (const [id, beamData] of this.localNavigationAids) {
      if (!posWithinReach(beamData.pos)) {
        continue;
      }

      if (beamData.autoremoveWhenNear) {
        this.removeNavigationAid(id);
      } else if (
        beamData.target.kind === "position" ||
        beamData.target.kind === "pos2d"
      ) {
        // This is hacky -- our triggers require notification of being near a specific location
        // so we publish a nav beam removal event here
        // TODO: verify this is necessary after adding above leaves
        sendRemoveBeamThrottledWithId(beamData.id, xzProject(beamData.pos));
      }
    }

    const leaves = this.resources.cached("/challenges/active_leaves");
    for (const leaf of leaves ?? []) {
      if (
        leaf.payload.kind === "mapBeam" &&
        pos2WithinReach(leaf.payload.location)
      ) {
        sendRemoveBeamThrottledWithId(leaf.id, leaf.payload.location);
      }

      if (
        leaf.payload.kind === "approachPosition" &&
        posWithinReach(leaf.payload.location)
      ) {
        sendRemoveBeamThrottledWithId(
          leaf.id,
          xzProject(leaf.payload.location)
        );
      }
    }

    for (const id of this.trackingPlayerIds) {
      const player = this.resources.get("/sim/player", id);
      const otherPlayerPos2d: Vec2 = [player.position[0], player.position[2]];
      if (dist2(pos2d, otherPlayerPos2d) < MapManager.MIN_BEAM_DISTANCE) {
        this.setTrackingPlayer(id, false);
      }
    }
  }
}

export async function loadMapManager(loader: RegistryLoader<ClientContext>) {
  const [userId, clientCache, resources, table, events, gardenHose] =
    await Promise.all([
      loader.get("userId"),
      loader.get("clientCache"),
      loader.get("resources"),
      loader.get("table"),
      loader.get("events"),
      loader.get("gardenHose"),
    ]);

  return new MapManager(
    userId,
    clientCache,
    resources,
    table,
    events,
    gardenHose
  );
}
