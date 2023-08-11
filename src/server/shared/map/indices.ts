import type { BDB } from "@/server/shared/storage";
import type { TileMap } from "@/shared/map/types";

function indicesPrefix() {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.USE_DEV_MAP_INDICES
  ) {
    return "indices_dev";
  }
  return "indices";
}

export async function fetchTileIndex(
  db: BDB,
  name: string
): Promise<TileMap | undefined> {
  return db
    .collection("map-indices")
    .doc(`${indicesPrefix()}:${name}`)
    .get()
    .then((value) => value.data());
}

export async function writeTileIndex(db: BDB, name: string, data: TileMap) {
  return db
    .collection("map-indices")
    .doc(`${indicesPrefix()}:${name}`)
    .set(data);
}
