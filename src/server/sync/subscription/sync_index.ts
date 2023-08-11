import type {
  LazyChange,
  LazyCreate,
  LazyUpdate,
} from "@/server/shared/ecs/lazy";
import type { WorldApi } from "@/server/shared/world/api";
import { isRealUser, type ClientId } from "@/server/sync/client";
import type { SyncServerContext } from "@/server/sync/context";
import { BackgroundTaskController } from "@/shared/abort";
import type { SyncShape } from "@/shared/api/sync";
import type { Closable } from "@/shared/closable";
import { changedBiomesId } from "@/shared/ecs/change";
import type { ReadonlyVec3f, ShardId } from "@/shared/ecs/gen/types";
import { WorldMetadataId } from "@/shared/ecs/ids";
import { SHARD_DIM, shardCenter, shardEncode } from "@/shared/game/shard";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import { centerAABB } from "@/shared/math/linear";
import { createGauge } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { ConditionVariable } from "@/shared/util/async";
import {
  DefaultMap,
  Mapping1N,
  MultiMap,
  removeValue,
} from "@/shared/util/collections";
import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";

const POSITIONLESS_SHARD = "" as ShardId;

function getBucketForPosition([x, y, z]: ReadonlyVec3f): ShardId {
  return shardEncode(
    Math.floor(x / SHARD_DIM),
    Math.floor(y / SHARD_DIM),
    Math.floor(z / SHARD_DIM)
  );
}

function scanBucketsWithinRadius([x, y, z]: ReadonlyVec3f, radius: number) {
  const ix = Math.floor(x / SHARD_DIM);
  const iy = Math.floor(y / SHARD_DIM);
  const iz = Math.floor(z / SHARD_DIM);
  const ir = Math.ceil(radius / SHARD_DIM);
  const rd2 = ir ** 2;
  const ids = new Set<ShardId>();
  for (let dz = -ir; dz <= ir; dz += 1) {
    for (let dy = -ir; dy <= ir; dy += 1) {
      for (let dx = -ir; dx <= ir; dx += 1) {
        if (dx ** 2 + dy ** 2 + dz ** 2 > rd2) {
          continue;
        }
        ids.add(shardEncode(ix + dx, iy + dy, iz + dz));
      }
    }
  }
  return ids;
}

function scanBucketsWithinBoxAround([x, y, z]: ReadonlyVec3f, size: number) {
  const ix = Math.floor(x / SHARD_DIM);
  const iy = Math.floor(y / SHARD_DIM);
  const iz = Math.floor(z / SHARD_DIM);
  const ir = Math.ceil(size / SHARD_DIM);
  const ids = new Set<ShardId>();
  for (let dz = -ir; dz <= ir; dz += 1) {
    for (let dy = -ir; dy <= ir; dy += 1) {
      for (let dx = -ir; dx <= ir; dx += 1) {
        ids.add(shardEncode(ix + dx, iy + dy, iz + dz));
      }
    }
  }
  return ids;
}

interface DeltaBuffer {
  add(id: BiomesId): void;
  remove(id: BiomesId): void;
  flush(changes: LazyChange[]): void;
}

class Bucket {
  private readonly ids = new Set<BiomesId>();
  private readonly buffers: DeltaBuffer[] = [];

  addEntity(id: BiomesId) {
    const oldSize = this.ids.size;
    this.ids.add(id);
    if (this.ids.size > oldSize) {
      for (const buffer of this.buffers) {
        buffer.add(id);
      }
    }
  }

  removeEntity(id: BiomesId) {
    if (this.ids.delete(id)) {
      for (const buffer of this.buffers) {
        buffer.remove(id);
      }
    }
  }

  addBuffer(buffer: DeltaBuffer) {
    this.buffers.push(buffer);
    for (const id of this.ids) {
      buffer.add(id);
    }
  }

  removeBuffer(buffer: DeltaBuffer) {
    if (removeValue(this.buffers, buffer)) {
      for (const id of this.ids) {
        buffer.remove(id);
      }
    }
  }
}

export type WatchedShapeEvents = {
  stop: () => void;
  delta: (changes: LazyChange[], delta: Map<BiomesId, boolean>) => void;
};

export interface WatchedShape extends TypedEventEmitter<WatchedShapeEvents> {
  readonly radius: number;
  move(center: ReadonlyVec3f): void;
  resize(size: number): void;
  flush(): void;
  dump(): unknown;
  stop(): void;
}

class WatchedShapeImpl
  extends (EventEmitter as { new (): TypedEventEmitter<WatchedShapeEvents> })
  implements DeltaBuffer, WatchedShape
{
  private watched = new Set<ShardId>();
  private center?: ReadonlyVec3f;
  private centerBucket?: ShardId;

  private readonly pending = new Map<BiomesId, boolean>();

  constructor(
    private readonly buckets: DefaultMap<ShardId, Bucket>,
    private shape: SyncShape,
    public radius: number
  ) {
    super();
    // World Metadata is everywhere.
    this.pending.set(WorldMetadataId, true);
  }

  add(id: BiomesId) {
    this.pending.set(id, true);
  }

  remove(id: BiomesId) {
    this.pending.set(id, false);
  }

  flush(changes?: LazyChange[]) {
    this.emit("delta", changes ?? [], this.pending);
    this.pending.clear();
  }

  dump() {
    return {
      radius: this.radius,
      from: this.center,
      watched: this.watched.size,
    };
  }

  stop() {
    for (const watched of this.watched) {
      this.buckets.get(watched).removeBuffer(this);
    }
    this.emit("stop");
    this.removeAllListeners();
  }

  private scan(): Set<ShardId> {
    if (!this.center || !this.centerBucket) {
      return this.watched;
    }
    switch (this.shape) {
      case "none":
        return this.watched;
      case "occlusion":
      // TODO: Implement occlusion based sync.
      // eslint-disable-next-line no-fallthrough
      case "sphere":
        return scanBucketsWithinRadius(this.center, this.radius);
      case "aabb":
        return scanBucketsWithinBoxAround(this.center, this.radius);
    }
  }

  private updateWatched(): void {
    const newWatched = this.scan();
    if (newWatched === this.watched) {
      return;
    }
    newWatched.add(POSITIONLESS_SHARD);
    for (const bucket of newWatched) {
      if (!this.watched.has(bucket)) {
        this.buckets.get(bucket).addBuffer(this);
      }
    }
    for (const bucket of this.watched) {
      if (!newWatched.has(bucket)) {
        this.buckets.get(bucket).removeBuffer(this);
      }
    }
    this.watched = newWatched;
  }

  move(aroundPoint: ReadonlyVec3f, aroundBucket?: ShardId): void {
    aroundBucket ??= getBucketForPosition(aroundPoint);
    this.center = aroundPoint;
    if (this.centerBucket === aroundBucket) {
      return;
    }
    this.centerBucket = aroundBucket;
    this.updateWatched();
  }

  resize(size: number): void {
    if (this.radius === size) {
      return;
    }
    this.radius = size;
    this.updateWatched();
  }
}

export type EntityClass = "player" | "robot" | "terrain" | "npc" | "placeable";

export interface EntityKnowledge {
  version?: number;
  entityClass?: EntityClass;
  position?: ReadonlyVec3f;
  bucket?: ShardId;
  team?: BiomesId;
  iced?: boolean;
}

export interface InternalEntityKnowledge extends EntityKnowledge {
  buffers: WatchedShapeImpl[];
}

export class SyncIndex {
  private readonly controller = new BackgroundTaskController();
  private readonly players = new Set<BiomesId>();
  private readonly terrain = new Set<BiomesId>();
  private readonly buckets = new DefaultMap<ShardId, Bucket>(
    () => new Bucket()
  );
  private readonly knowledge = new DefaultMap<
    ClientId,
    InternalEntityKnowledge
  >(() => ({ buffers: [] }));
  private readonly buffers: WatchedShapeImpl[] = [];
  private readonly singleWatches = new MultiMap<
    BiomesId,
    (change: LazyChange) => void
  >();
  private readonly ownerToRobots = new Mapping1N<BiomesId>();

  constructor(private readonly worldApi: WorldApi) {
    createGauge({
      name: "sync_index_buffers",
      help: "Number of watch-buffers in the sync index",
      collect: (g) => {
        g.set(this.buffers.length);
      },
    });
  }

  get playerCount() {
    return this.players.size;
  }

  getRobots(ownerId: BiomesId) {
    return this.ownerToRobots.getByKey(ownerId);
  }

  getKnowledge(id: BiomesId): EntityKnowledge {
    return this.knowledge.get(id);
  }

  has(id: BiomesId) {
    return this.knowledge.get(id).version;
  }

  async start() {
    const cv = new ConditionVariable();
    this.controller.runInBackground("syncIndex", (signal) =>
      this.processWorldUpdates(signal, cv)
    );
    await cv.wait();
    // Create index stats only after bootstrapped.
    createGauge({
      name: "sync_index_entities",
      help: "Number of entities in the sync index",
      labelNames: ["type"],
      collect: (g) => {
        g.set({ type: "player" }, this.players.size);
        g.set({ type: "terrain" }, this.terrain.size);
        g.set({ type: "robotOwner" }, this.ownerToRobots.keyCount);
        g.set({ type: "robot" }, this.ownerToRobots.valueCount);
        g.set({ type: "all" }, this.knowledge.size);
      },
    });
  }

  watchOne(id: BiomesId, cb: (change: LazyChange) => void): Closable {
    this.singleWatches.add(id, cb);
    return {
      close: () => {
        this.singleWatches.delete(id, cb);
      },
    };
  }

  private async processWorldUpdates(
    signal: AbortSignal,
    bootstrappedCv: ConditionVariable
  ) {
    for await (const { changes, bootstrapped } of this.worldApi.subscribe(
      {
        filter: {
          noneOf: ["iced"],
        },
      },
      signal
    )) {
      for (const change of changes) {
        if (change.kind === "delete") {
          this.delete(change.id);
        } else {
          this.update(change);
        }
        const id = changedBiomesId(change);
        for (const watch of this.singleWatches.get(id)) {
          watch(change);
        }
      }
      for (const buffer of this.buffers) {
        buffer.flush(changes);
      }
      if (bootstrapped) {
        bootstrappedCv.signal();
      }
    }
    // In case of early abort, unblock the caller.
    bootstrappedCv.signal();
  }

  async stop() {
    await this.controller.abortAndWait();
    this.buckets.clear();
    this.knowledge.clear();
  }

  watch(shape: SyncShape, aroundId: ClientId, radius: number): WatchedShape {
    const watch = new WatchedShapeImpl(this.buckets, shape, radius);
    const knowledge = this.knowledge.get(aroundId);
    this.buffers.push(watch);
    knowledge.buffers.push(watch);
    watch.once("stop", () => {
      removeValue(this.buffers, watch);
      removeValue(knowledge.buffers, watch);
      if (!isRealUser(aroundId)) {
        this.knowledge.delete(aroundId);
      }
    });

    // Move into position.
    if (isRealUser(aroundId)) {
      const position = this.getLastApproximateLocation(aroundId);
      if (position !== undefined) {
        watch.move(position, getBucketForPosition(position));
      }
    }
    return watch;
  }

  get size() {
    return this.knowledge.size;
  }

  private delete(id: BiomesId) {
    const knowledge = this.knowledge.get(id);
    if (knowledge?.bucket !== undefined) {
      this.buckets.get(knowledge?.bucket).removeEntity(id);
    }
    this.knowledge.delete(id);
    this.players.delete(id);
    this.terrain.delete(id);
  }

  private update(change: Readonly<LazyCreate | LazyUpdate>) {
    const { entity } = change;
    const knowledge = this.knowledge.get(entity.id);

    knowledge.version = Math.max(knowledge.version ?? 1, change.tick);

    if (entity.altersRemoteConnection()) {
      knowledge.entityClass = "player";
      this.players.add(entity.id);
    } else if (entity.altersRobotComponent()) {
      knowledge.entityClass = "robot";
    } else if (entity.altersShardSeed()) {
      knowledge.entityClass = "terrain";
      this.terrain.add(entity.id);
    } else if (entity.altersNpcMetadata()) {
      knowledge.entityClass = "npc";
    } else if (entity.altersPlaceableComponent()) {
      knowledge.entityClass = "placeable";
    }

    if (entity.altersIced()) {
      knowledge.iced = entity.hasIced();
    }

    if (entity.altersPlayerCurrentTeam()) {
      knowledge.team = entity.playerCurrentTeam()?.team_id ?? undefined;
    }

    if (knowledge.entityClass === "robot" && entity.altersCreatedBy()) {
      this.ownerToRobots.add(
        entity.createdBy()?.id ?? INVALID_BIOMES_ID,
        entity.id
      );
    }

    let positionDirty = false;
    if (entity.altersPosition() && entity.position()) {
      knowledge.position = entity.position()!.v;
      positionDirty = true;
    } else if (entity.altersBox() && entity.box()) {
      knowledge.position = centerAABB([entity.box()!.v0, entity.box()!.v1]);
      positionDirty = true;
    }

    if (positionDirty || !knowledge.bucket) {
      const newBucket = knowledge.position
        ? getBucketForPosition(knowledge.position)
        : POSITIONLESS_SHARD;
      if (newBucket !== knowledge.bucket) {
        if (knowledge.bucket !== undefined) {
          this.buckets.get(knowledge.bucket).removeEntity(entity.id);
        }
        if (newBucket !== undefined) {
          this.buckets.get(newBucket).addEntity(entity.id);
        }
        knowledge.bucket = newBucket;
        if (newBucket !== undefined) {
          for (const buffer of knowledge.buffers) {
            buffer.move(knowledge.position!, newBucket);
          }
        }
      }
    }
  }

  getLastApproximateLocation(id: BiomesId): ReadonlyVec3f | undefined {
    const knowledge = this.knowledge.get(id);
    if (knowledge?.position !== undefined) {
      return knowledge.position;
    }
    if (knowledge?.bucket) {
      return shardCenter(knowledge?.bucket);
    }
  }
}

export async function registerSyncIndex<C extends SyncServerContext>(
  loader: RegistryLoader<C>
) {
  return new SyncIndex(await loader.get("worldApi"));
}
