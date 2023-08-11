import type { MapContext } from "@/server/map/context";
import type { MapPreload } from "@/server/map/preload";
import type { MapResources } from "@/server/map/resources";
import type { MapStore } from "@/server/map/storage";
import { MAX_ZOOM_LEVEL, ZOOM_LEVELS } from "@/server/map/tiles/config";
import type { ImageBox } from "@/server/map/tiles/utils";
import { tileAncestors, tileChildren } from "@/server/map/tiles/utils";
import type { CloseAndWait } from "@/server/map/utils";
import {
  ColumnBatcher,
  loop,
  worldLeafTiles,
  worldToTilePos,
} from "@/server/map/utils";
import type { WorldHelper } from "@/server/map/world";
import { CycleBatcher, OnceBatcher } from "@/server/shared/batcher";
import type { Replica } from "@/server/shared/replica/table";
import type { Closable } from "@/shared/closable";
import type { AsDelta, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { Entity } from "@/shared/ecs/gen/entities";
import { SHARD_DIM } from "@/shared/game/shard";
import { log } from "@/shared/logging";
import { tileName } from "@/shared/map/paths";
import type { TileKey, TilePos, TileType } from "@/shared/map/types";
import { add2 } from "@/shared/math/linear";
import type { ReadonlyVec2, ReadonlyVec3 } from "@/shared/math/types";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import type { RegistryLoader } from "@/shared/registry";
import { TimeWindow } from "@/shared/util/throttling";

const TILE_FLAVORS: TileType[] = ["surface", "fog"];

const tickCount = createCounter({
  name: "map_tick_count",
  help: "The count of map pipeline ticks.",
});

const pipelneTimings = createGauge({
  name: "map_pipeline_timings",
  help: "The count of map resources.",
  labelNames: ["section"],
});

const freshUpdateCount = createCounter({
  name: "map_fresh_update_count",
  help: "The count of updated tiles that were fresh.",
});

const staleUpdateCount = createCounter({
  name: "map_stale_update_count",
  help: "The count of updated tiles that were stale.",
});

const resourcesCount = createGauge({
  name: "map_resources_count",
  help: "The count of map resources.",
});

class TickTimer {
  constructor(private timer = new Timer()) {}
  record(section: string) {
    pipelneTimings.set({ section }, this.timer.elapsed);
    this.timer.reset();
  }
}

export class MapPipeline {
  private loop?: CloseAndWait;
  private subscription?: Closable;
  private queue = {
    hi: new OnceBatcher<TilePos, string>(([u, v]) => `${u}:${v}`),
    lo: new CycleBatcher<TilePos>(),
  };
  private throttle = new TimeWindow(30_000);
  private changes = new ColumnBatcher();

  constructor(
    readonly preload: MapPreload,
    readonly replica: Replica,
    readonly resources: MapResources,
    readonly worldHelper: WorldHelper,
    readonly store: MapStore
  ) {}

  private affectsMap(delta: AsDelta<ReadonlyEntity>) {
    return anyDefined([
      delta.shard_seed,
      delta.shard_diff,
      delta.shard_dye,
      delta.shard_water,
      delta.shard_muck,
    ]);
  }

  private invalidate(column: ReadonlyVec2, shards: ReadonlyVec3[]) {
    // Invalidate the source terrain resources.
    for (const shard of shards) {
      this.resources.invalidate("/world/signal", ...shard);
    }

    // Record the impacted tiles as being invalid to prioritize their update.
    const tile = worldToTilePos(column);
    for (let dv = -1; dv <= 1; dv += 1) {
      for (let du = -1; du <= 1; du += 1) {
        const [u, v] = add2(tile, [du, dv]);
        if (this.worldHelper.contains([SHARD_DIM * u, 0, SHARD_DIM * v])) {
          this.queue.hi.push([u, v]);
        }
      }
    }
  }

  async start() {
    // Schedule all tiles for periodic updates on the lo-pri queue.
    log.info("Scheduling lo-pri tiles for updates");
    for (const [u, v] of worldLeafTiles(this.worldHelper.getWorldBounds())) {
      this.queue.lo.push([u, v]);
    }

    // Whenever terrain is updated, immediately schedule nearby tile updates.
    log.info("Subscribing to world updates");
    const listener = this.replica.on("tick", (changes) => {
      for (const change of changes) {
        if (change.kind === "update" && this.affectsMap(change.entity)) {
          const entity = this.replica.table.get(change.entity.id);
          if (Entity.has(entity, "box", "shard_seed")) {
            this.changes.add(entity.box.v0);
          }
        }
      }
    });
    this.subscription = {
      close: () => this.replica.off("tick", listener),
    };

    // Start an event loop to compute and publish updated tiles.
    this.loop = loop("pipeline", () => this.tick());
  }

  async stop() {
    if (this.loop) {
      await this.loop.close();
    }
    this.subscription?.close();
  }

  async tick() {
    tickCount.inc();
    const timer = new TickTimer();

    // Handle invalidation from changed entities.
    for (const [key, col, batch] of this.changes.drain()) {
      if (this.throttle.throttleOrUse(key)) {
        this.changes.addBatch(batch);
      } else {
        this.invalidate(col, batch);
      }
    }
    timer.record("invalidation");

    // Pop the next highest priority tile. Tiles that are known to be invalid
    // due to terrain changes are of highest priority proportional on their age.
    const tile = (() => {
      if (this.queue.hi.size > 0) {
        staleUpdateCount.inc();
        return this.queue.hi.next().value;
      } else {
        freshUpdateCount.inc();
        return this.queue.lo.next().value;
      }
    })();
    timer.record("dequeue");

    // Schedule the generationg of tiles from the priority queue.
    const updates = new Map<TileKey, ImageBox>();
    for (const flavor of TILE_FLAVORS) {
      for (const [pos, level] of tileAncestors(tile, ZOOM_LEVELS)) {
        // Short circuit if any of the children have not yet been generated.
        if (
          level > 0 &&
          !tileChildren(pos).every((child) => {
            return this.preload.has(flavor, level - 1, child);
          })
        ) {
          break;
        }

        // Short circuit if we've already generated this tile.
        const key = tileName(flavor, level, pos);
        if (updates.has(key)) {
          break;
        }

        // Remove this tile from the preload cache before generating it.
        this.preload.del(flavor, level, pos);

        // Generate the new tile.
        const image = await this.resources.get(
          `/tiles/${flavor}`,
          level,
          ...pos
        );
        this.preload.set(flavor, level, pos, image);
        updates.set(key, image);
      }
    }
    timer.record("updates");

    // Also update the admin map if all children exist.
    if (
      this.preload.has("surface", MAX_ZOOM_LEVEL, [-1, -1]) &&
      this.preload.has("surface", MAX_ZOOM_LEVEL, [0, -1]) &&
      this.preload.has("surface", MAX_ZOOM_LEVEL, [-1, 0]) &&
      this.preload.has("surface", MAX_ZOOM_LEVEL, [0, 0])
    ) {
      updates.set("admin", await this.resources.get("/tiles/admin"));
    }
    timer.record("admin");

    // Emit the new tiles to GCS.
    for (const [path, image] of updates) {
      this.store.write(path, image.png);
    }
    await this.store.flush();
    timer.record("writes");

    // Do some garbage collection of cached resources.
    this.resources.collect();
    resourcesCount.set(this.resources.count());
    timer.record("gc");
  }
}

function anyDefined(values: unknown[]) {
  return !values.every((v) => v == null);
}

export async function registerPipeline<C extends MapContext>(
  loader: RegistryLoader<C>
) {
  const [preload, replica, resources, worldHelper, store] = await Promise.all([
    loader.get("preload"),
    loader.get("replica"),
    loader.get("resources"),
    loader.get("worldHelper"),
    loader.get("store"),
  ]);
  return new MapPipeline(preload, replica, resources, worldHelper, store);
}
