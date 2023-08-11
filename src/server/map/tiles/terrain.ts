import type { MapResourceDeps } from "@/server/map/resources";
import type { TileContext } from "@/server/map/tiles/types";
import { makeDisposable } from "@/shared/disposable";
import type { ShardId } from "@/shared/game/shard";
import { worldPos } from "@/shared/game/shard";
import {
  loadDye,
  loadMuck,
  loadTerrain,
  loadWater,
} from "@/shared/game/terrain";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { VoxelooModule } from "@/shared/wasm/types";

export function genWorldTerrain(
  { voxeloo, worldHelper }: TileContext,
  deps: MapResourceDeps,
  x: number,
  y: number,
  z: number
) {
  deps.get("/world/signal", x, y, z);
  const entity = worldHelper.getTerrainShard([x, y, z]);
  if (entity) {
    const ret = loadTerrain(voxeloo, entity);
    if (ret) {
      return makeDisposable(ret, () => ret.delete());
    }
  }
}

export function genWorldWater(
  { voxeloo, worldHelper }: TileContext,
  deps: MapResourceDeps,
  x: number,
  y: number,
  z: number
) {
  deps.get("/world/signal", x, y, z);
  const entity = worldHelper.getTerrainShard([x, y, z]);
  if (entity) {
    const ret = loadWater(voxeloo, entity);
    if (ret) {
      return makeDisposable(ret, () => ret.delete());
    }
  }
}

export function genWorldMuck(
  { voxeloo, worldHelper }: TileContext,
  deps: MapResourceDeps,
  x: number,
  y: number,
  z: number
) {
  deps.get("/world/signal", x, y, z);
  const entity = worldHelper.getTerrainShard([x, y, z]);
  if (entity) {
    const ret = loadMuck(voxeloo, entity);
    if (ret) {
      return makeDisposable(ret, () => ret.delete());
    }
  }
}

export function genWorldDye(
  { voxeloo, worldHelper }: TileContext,
  deps: MapResourceDeps,
  x: number,
  y: number,
  z: number
) {
  deps.get("/world/signal", x, y, z);
  const entity = worldHelper.getTerrainShard([x, y, z]);
  if (entity) {
    const ret = loadDye(voxeloo, entity);
    if (ret) {
      return makeDisposable(ret, () => ret.delete());
    }
  }
}

export function makeTerrainHelper(
  voxeloo: VoxelooModule,
  deps: MapResourceDeps
) {
  return new TerrainHelper(
    voxeloo,
    () => undefined,
    (id: ShardId) => deps.get("/world/terrain", ...worldPos(id)),
    () => undefined,
    () => undefined,
    () => undefined,
    (id: ShardId) => deps.get("/world/muck", ...worldPos(id)),
    (id: ShardId) => deps.get("/world/water", ...worldPos(id)),
    (id: ShardId) => deps.get("/world/dye", ...worldPos(id)),
    () => undefined,
    () => undefined,
    () => undefined
  );
}
