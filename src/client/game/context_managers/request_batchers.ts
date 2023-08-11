import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import { ecsWearablesToWarmupUrl } from "@/client/game/resources/player_mesh";
import type {
  LeaderboardGetAfterQuery,
  LeaderboardGetAfterRequest,
  LeaderboardGetAfterResponse,
} from "@/pages/api/social/leaderboard_get_after";
import type {
  LeaderboardGetValuesRequest,
  LeaderboardGetValuesResponse,
  LeaderboradRequestValueQuery,
} from "@/pages/api/social/leaderboard_get_values";
import type { LeaderboardPosition } from "@/server/shared/world/api";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import type { FeedPostBundle } from "@/shared/types";
import { TimedRequestBatcher } from "@/shared/util/batch";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import {
  fetchPostBundles,
  fetchUserInfoBundles,
} from "@/shared/util/fetch_bundles";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { TimeWindow } from "@/shared/util/throttling";
import { ok } from "assert";

export class RequestThrottler<Args extends unknown[]> {
  private readonly throttle: TimeWindow<string>;

  constructor(
    private readonly urlFn: (...args: Args) => string,
    delayMs: number
  ) {
    this.throttle = new TimeWindow<string>(delayMs);
  }

  async fetch(...args: Args) {
    const url = this.urlFn(...args);
    if (!this.throttle.throttleOrUse(url)) {
      await fetch(url);
    }
  }
}

export class RequestBatchers {
  postRequestBatcher = new TimedRequestBatcher<
    FeedPostBundle | undefined,
    BiomesId
  >(async (ids) => {
    const ret = await fetchPostBundles(ids);
    return ret.posts;
  });
  userInfoBundleRequestBatcher = new TimedRequestBatcher<
    UserInfoBundle | undefined,
    BiomesId
  >(async (ids) => {
    const ret = await fetchUserInfoBundles(ids);
    return ret.map((e) => e ?? undefined);
  });
  leaderboardGetValuesRequestBatcher = new TimedRequestBatcher<
    LeaderboardPosition | undefined,
    LeaderboradRequestValueQuery
  >(async (queries) => {
    const res = await jsonPost<
      LeaderboardGetValuesResponse,
      LeaderboardGetValuesRequest
    >("/api/social/leaderboard_get_values", queries);

    ok(res.length === queries.length);
    return res.map((e) => e ?? undefined);
  });

  leaderboardGetAfterRequestBatcher = new TimedRequestBatcher<
    LeaderboardPosition[],
    LeaderboardGetAfterQuery
  >(async (queries) => {
    const res = await jsonPost<
      LeaderboardGetAfterResponse,
      LeaderboardGetAfterRequest
    >("/api/social/leaderboard_get_after", queries);

    ok(res.length === queries.length);
    return res;
  });

  oobRequestBatcher = new TimedRequestBatcher<
    ReadonlyEntity | undefined,
    BiomesId
  >(async (queries) => {
    return this.deps.table.oob.oobFetch(queries);
  });

  playerMeshWarmer = new RequestThrottler(ecsWearablesToWarmupUrl, 120 * 1000);

  constructor(private readonly deps: ClientContextSubset<"table">) {}
}

export async function loadRequestBatchers(
  loader: RegistryLoader<ClientContext>
): Promise<RequestBatchers> {
  const deps = await loader.getAll("table");
  return new RequestBatchers(deps);
}
