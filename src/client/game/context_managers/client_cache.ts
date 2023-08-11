import type { EarlyClientContext } from "@/client/game/context";
import type { UserPhotosResponse } from "@/pages/api/social/user_photos";
import type { Landmark } from "@/pages/api/world_map/landmarks";
import type { Mailbox } from "@/pages/api/world_map/mailboxes";
import {
  GenericCache,
  PrefixScannableMemoryCacheBackend,
} from "@/server/shared/cache/generic_cache";
import type { CachePathDef } from "@/server/shared/cache/types";
import type { LeaderboardPosition } from "@/server/shared/world/api";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import type { Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import type {
  FeedPostBundle,
  GroupDetailBundle,
  InviteCodeBundle,
} from "@/shared/types";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";

export interface ClientCachePrefixes {
  groupBundle: CachePathDef<[BiomesId], GroupDetailBundle | null>;
  inviteCodes: CachePathDef<[BiomesId], InviteCodeBundle[] | null>;
  leaderboardValue: CachePathDef<
    [BiomesId, string],
    LeaderboardPosition | null
  >;
  leaderboardGetAfter: CachePathDef<
    [string, string, string],
    LeaderboardPosition[]
  >;

  landmarks: CachePathDef<[], Landmark[]>;
  mailboxes: CachePathDef<[], Mailbox[]>;
  npcTypeLocation: CachePathDef<[BiomesId], Vec3[] | null>;
  postBundle: CachePathDef<[BiomesId], FeedPostBundle | null>;
  oobFetch: CachePathDef<[BiomesId], ReadonlyEntity | null>;
  userInfoBundle: CachePathDef<[BiomesId], UserInfoBundle | null>;
  userInfoByName: CachePathDef<[string], UserInfoBundle | null>;
  userFollowedIds: CachePathDef<[BiomesId], Array<BiomesId> | null>;
  userInitialPostsResponse: CachePathDef<[BiomesId], UserPhotosResponse | null>;
}

export type ClientCache = GenericCache<
  ClientCachePrefixes,
  PrefixScannableMemoryCacheBackend
>;

export async function loadClientCache(
  _loader: RegistryLoader<EarlyClientContext>
): Promise<ClientCache> {
  return new GenericCache(new PrefixScannableMemoryCacheBackend());
}
