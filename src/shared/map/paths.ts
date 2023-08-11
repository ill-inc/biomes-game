import type { TileKey, TilePos, TileType, TileZoom } from "@/shared/map/types";
import { bucketURL } from "@/shared/url_types";

function tilePathPrefix() {
  return process.env.NODE_ENV === "production" ? "map/tiles" : "map/tiles_dev";
}

export function tileName(
  type: TileType,
  zoom: TileZoom,
  [u, v]: TilePos
): TileKey {
  return `${type}/${zoom}_${u}_${v}`;
}

export function tilePathFromKey(key: TileKey) {
  return `${tilePathPrefix()}/${key}`;
}

export function tilePath(type: TileType, zoom: TileZoom, pos: TilePos) {
  return `${tilePathPrefix()}/${tileName(type, zoom, pos)}`;
}

export function tileURL(
  version: number,
  type: TileType,
  zoom: TileZoom,
  pos: TilePos
) {
  const baseUrl = bucketURL("biomes-static", tilePath(type, zoom, pos), true);
  return `${baseUrl}?version=${version}`;
}

export function adminImageURL(version: number) {
  const imgPath = `${tilePathPrefix()}/admin`;
  const baseUrl = bucketURL("biomes-static", imgPath, true);
  return `${baseUrl}?version=${version}`;
}
