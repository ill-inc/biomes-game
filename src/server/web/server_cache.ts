import type { CachedPlayerMesh } from "@/pages/api/assets/player_mesh.glb";
import type { Leaderboard } from "@/pages/api/social/leaderboards";
import { GenericCache } from "@/server/shared/cache/generic_cache";
import { RedisBackend } from "@/server/shared/cache/redis_backend";
import type { CachePathDef } from "@/server/shared/cache/types";
import type { CacheMode } from "@/server/shared/server_config";
import type { LeaderboardWindow } from "@/server/shared/world/api";
import type { FirestoreSession } from "@/server/web/db/types";
import type { BiomesId } from "@/shared/ids";
import type { CachedImage } from "@/shared/images/types";
import { log } from "@/shared/logging";
import type { Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { caching } from "cache-manager";

export interface ServerCachePrefixes {
  "player-mesh": CachePathDef<[string], CachedPlayerMesh>;
  "images-cache": CachePathDef<[string], CachedImage>;
  session: CachePathDef<[string], FirestoreSession | null>;
  npcTypeLocations: CachePathDef<[BiomesId], Array<[BiomesId, Vec3]> | null>;
  leaderboard: CachePathDef<
    [LeaderboardWindow],
    { leaderboards: Leaderboard[] }
  >;
  pushNonces: CachePathDef<[BiomesId, string], string>;
}

export type ServerCache = GenericCache<ServerCachePrefixes>;

export interface CacheClientContext {
  config: {
    serverCacheMode: CacheMode;
  };
}

const CACHE_TTL_SECS = 5 * 60;
const CACHE_PREFIX = "v1:";

export async function registerCacheClient<C extends CacheClientContext>(
  loader: RegistryLoader<C>
): Promise<ServerCache> {
  const config = await loader.get("config");
  if (config.serverCacheMode === "redis") {
    log.info("Using redis for server cache");
    try {
      return new GenericCache(
        await RedisBackend.create(CACHE_TTL_SECS, CACHE_PREFIX)
      );
    } catch (error) {
      log.warn("Redis not available, falling back to local cache", { error });
    }
  }
  return new GenericCache(
    caching({
      store: "memory",
      max: 1000,
      ttl: CACHE_TTL_SECS,
    })
  );
}
