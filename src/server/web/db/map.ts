import { MAP_WORLD_KEY } from "@/server/map/world";
import { fetchTileIndex } from "@/server/shared/map/indices";
import type { BDB } from "@/server/shared/storage";
import { dedupeNearbyPhotos, recentFeedPosts } from "@/server/web/db/social";
import { fetchWorldMapByWorldKey } from "@/server/web/db/world_map";
import { absoluteBucketURL } from "@/server/web/util/urls";
import { adminImageURL } from "@/shared/map/paths";
import { decodeTileMap } from "@/shared/map/serde";
import type { MapSocialData } from "@/shared/types";

export type MapTileMetadata = NonNullable<
  Awaited<ReturnType<typeof fetchTileMetadata>>
>;

export async function fetchTileMetadata(db: BDB) {
  const lastGeneratedData = await fetchWorldMapByWorldKey(db, MAP_WORLD_KEY);
  if (!lastGeneratedData) {
    return;
  }
  const data = {
    ...lastGeneratedData,
    ...CONFIG.overrideMapMetadata,
  };
  // Fetch the tile indices.
  const versionIndex = await (async () => {
    const index = await fetchTileIndex(db, "versions");
    if (index) {
      const decoded = await decodeTileMap(index.blob);
      return Object.fromEntries(
        Array.from(decoded, ([k, v]) => [k, parseInt(v)])
      );
    } else {
      return {};
    }
  })();

  return {
    id: MAP_WORLD_KEY,
    version: String(data.version),
    fullImageURL: adminImageURL(versionIndex["admin"]),
    fullImageWidth: data.webPFullWidth,
    fullImageHeight: data.webPFullHeight,
    fullTileImageURL: absoluteBucketURL(data.cloudBucket, data.webPFullTileKey),
    boundsStart: data.boundsStart,
    boundsEnd: data.boundsEnd,

    tileImageTemplateURL: absoluteBucketURL(
      data.cloudBucket,
      data.tileWebPTemplateKey
    ),
    tileMaxZoomLevel: data.tileMaxZoomLevel,
    tileMinZoomLevel: data.tileMinZoomLevel,
    tileSize: data.tileSize,
    versionIndex,
  };
}

export async function fetchSocialMetadata(db: BDB) {
  const recentPosts = await recentFeedPosts(db);
  const deduped = dedupeNearbyPhotos(
    recentPosts,
    CONFIG.mapServerPhotoMinDistance,
    CONFIG.mapServerPhotoNumToCalculate
  );

  // TODO: clean this up once we decide on the photo units we want
  const baseSocialData: MapSocialData = {
    recentPhotoPositions: deduped
      .filter((e) => e.media?.length && e.media[0].metadata?.coordinates)
      .map((e) => [e.id, e.media![0].metadata!.coordinates]),
  };

  return baseSocialData;
}
