import type { MapPreload } from "@/server/map/preload";
import type { WorldHelper } from "@/server/map/world";
import type { VoxelooModule } from "@/shared/wasm/types";

export type Tile = [number, number];

export interface TileContext {
  preload: MapPreload;
  worldHelper: WorldHelper;
  voxeloo: VoxelooModule;
}
