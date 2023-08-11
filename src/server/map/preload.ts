import type { MapContext } from "@/server/map/context";
import type { MapResources } from "@/server/map/resources";
import type { MapStore } from "@/server/map/storage";
import { ZOOM_LEVELS } from "@/server/map/tiles/config";
import {
  ImageBox,
  tileAncestors,
  tileChildren,
} from "@/server/map/tiles/utils";
import { worldLeafTiles } from "@/server/map/utils";
import type { WorldHelper } from "@/server/map/world";
import { LightTrace } from "@/shared/light_trace";
import { log } from "@/shared/logging";
import { tileName } from "@/shared/map/paths";
import type { TileKey, TilePos, TileType } from "@/shared/map/types";
import type { RegistryLoader } from "@/shared/registry";

export interface MapPreload {
  start(): Promise<void>;
  has(type: TileType, level: number, pos: TilePos): boolean;
  get(type: TileType, level: number, pos: TilePos): PreloadBox | undefined;
  set(type: TileType, level: number, pos: TilePos, img: ImageBox): void;
  del(type: TileType, level: number, pos: TilePos): void;
}

type PreloadBox = () => Promise<ImageBox | undefined>;

class MapPreloadImpl {
  private map = new Map<string, PreloadBox>();

  constructor(
    private resources: MapResources,
    private store: MapStore,
    private worldHelper: WorldHelper
  ) {}

  private getPreloadKeys(type: TileType) {
    const keys = new Map<TileKey, [number, TilePos]>();

    // Add all ancestors from the leaf tiles inside the world bounds.
    for (const tile of worldLeafTiles(this.worldHelper.getWorldBounds())) {
      for (const [pos, level] of tileAncestors(tile, ZOOM_LEVELS)) {
        const key = tileName(type, level, pos);
        if (keys.has(key)) {
          break;
        } else {
          keys.set(key, [level, pos]);
        }
      }
    }

    // We also need to add all descendents.
    const stack = Array.from(keys.values());
    while (stack.length > 0) {
      const parent = stack.pop()!;
      const level = parent[0] - 1;
      if (level >= 0) {
        for (const pos of tileChildren(parent[1])) {
          const key = tileName(type, level, pos);
          if (keys.has(key)) {
            continue;
          } else {
            keys.set(key, [level, pos]);
            stack.push([level, pos]);
          }
        }
      }
    }

    return keys;
  }

  private async preloadType(type: TileType) {
    const trace = new LightTrace();

    const keys = this.getPreloadKeys(type);
    trace.mark("traversal");

    // Fetch and cache the image data for each distinct tile.
    let count = 0;
    for (const [key, [level, pos]] of keys) {
      if (this.store.exists(key)) {
        count += 1;
        this.map.set(tileName(type, level, pos), async () => {
          return this.store
            .read(key)
            .then((buffer) => new ImageBox(buffer))
            .catch((error) => {
              log.error(`Failed to fetch tile ${key}`, { error });
              return undefined;
            });
        });
      }
    }
    trace.mark("download");
    log.info(`Preloaded ${count} of ${keys.size} "${type}" tiles. ${trace}`);
  }

  async start() {
    log.info("Preloading tile images from storage");
    await this.preloadType("surface");
    await this.preloadType("fog");
  }

  has(type: TileType, level: number, pos: TilePos) {
    return this.map.has(tileName(type, level, pos));
  }

  get(type: TileType, level: number, pos: TilePos) {
    return this.map.get(tileName(type, level, pos));
  }

  set(type: TileType, level: number, pos: TilePos, img: ImageBox) {
    this.map.set(tileName(type, level, pos), () => Promise.resolve(img));
    this.resources.invalidate("/tiles/preload", type, level, ...pos);
  }

  del(type: TileType, level: number, pos: TilePos) {
    this.map.delete(tileName(type, level, pos));
    this.resources.invalidate("/tiles/preload", type, level, ...pos);
  }
}

export async function registerPreload<C extends MapContext>(
  loader: RegistryLoader<C>
) {
  const [resources, store, worldHelper] = await Promise.all([
    loader.get("resources"),
    loader.get("store"),
    loader.get("worldHelper"),
  ]);
  return new MapPreloadImpl(resources, store, worldHelper);
}
