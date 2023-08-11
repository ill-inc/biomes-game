import type { ClientResources } from "@/client/game/resources/types";
import { DEFAULT_RETRY_DELAY } from "@/client/game/util/fishing/params";
import type { FailedFishingInfo } from "@/client/game/util/fishing/state_machine";
import type {
  LeaderboardGetAfterRequest,
  LeaderboardGetAfterResponse,
} from "@/pages/api/social/leaderboard_get_after";
import type {
  LeaderboardNearbyValuesRequest,
  LeaderboardNearbyValuesResponse,
} from "@/pages/api/social/leaderboard_nearby_values";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import type { Item } from "@/shared/ecs/extern";
import type { BiomesId } from "@/shared/ids";
import { add, scale } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { ok } from "assert";
import { sortBy } from "lodash";

export function physicsHookPosition(
  start: ReadonlyVec3,
  velocity: ReadonlyVec3,
  gravity: ReadonlyVec3,
  dt: number
) {
  return add(add(start, scale(dt, velocity)), scale((dt * dt) / 2, gravity));
}

export type FishRecord =
  | {
      kind: "personal_record";
      window: "weekly" | "all_time";
      scopedToId?: BiomesId;
      value: number;
      lastValue?: number;
    }
  | {
      kind: "leaderboard_pos";
      window: "weekly" | "all_time";
      scopedToId?: BiomesId;
      rank: number;
      value: number;
      nextUserId?: BiomesId;
      nextValue?: number;
    };

export async function fetchLeaderboardInfoForCatch(
  userId: BiomesId,
  item: Item
): Promise<Array<FishRecord>> {
  const itemLength = item.fishLength ?? 0;
  const [allTimePreviousRecord, [allTimeNewPositions], [weeklyNewPositions]] =
    await Promise.all([
      jsonPost<LeaderboardNearbyValuesResponse, LeaderboardNearbyValuesRequest>(
        "/api/social/leaderboard_nearby_values",
        {
          window: "alltime",
          aboveCount: 0,
          belowCount: 0,
          order: "DESC",
          leaderboard: {
            kind: "fished_length",
            id: item.id,
          },
        }
      ),

      jsonPost<LeaderboardGetAfterResponse, LeaderboardGetAfterRequest>(
        "/api/social/leaderboard_get_after",
        [
          {
            window: "alltime",
            order: "DESC",
            leaderboard: {
              kind: "fished_length",
              id: item.id,
            },
            score: item.fishLength,
            count: 3,
          },
        ]
      ),

      jsonPost<LeaderboardGetAfterResponse, LeaderboardGetAfterRequest>(
        "/api/social/leaderboard_get_after",
        [
          {
            window: "thisWeek",
            order: "DESC",
            leaderboard: {
              kind: "fished_length",
              id: item.id,
            },
            score: itemLength,
            count: 3,
          },
        ]
      ),
    ]);

  const ret: Array<FishRecord> = [];
  if (
    allTimePreviousRecord.nearby === undefined ||
    allTimePreviousRecord.nearby.length === 0
  ) {
    ret.push({
      kind: "personal_record",
      window: "all_time",
      scopedToId: item.id,
      value: itemLength,
    });
  } else if (allTimePreviousRecord.nearby) {
    ok(allTimePreviousRecord.nearby.length === 1);
    const myPrevValue = allTimePreviousRecord.nearby[0];
    if (myPrevValue.value < itemLength) {
      ret.push({
        kind: "personal_record",
        window: "all_time",
        scopedToId: item.id,
        value: itemLength,
        lastValue: myPrevValue.value,
      });
    }
  }

  if (allTimeNewPositions.length > 0 && allTimeNewPositions[0].rank <= 10) {
    const pos = allTimeNewPositions[0];
    ret.push({
      kind: "leaderboard_pos",
      window: "all_time",
      scopedToId: item.id,
      rank: pos.rank,
      value: itemLength,
      nextUserId: pos.id !== userId ? pos.id : undefined,
      nextValue: pos.id !== userId ? pos.value : undefined,
    });
  } else if (weeklyNewPositions.length > 0 && weeklyNewPositions[0].rank <= 5) {
    const pos = weeklyNewPositions[0];
    ret.push({
      kind: "leaderboard_pos",
      window: "weekly",
      scopedToId: item.id,
      rank: pos.rank,
      value: itemLength,
      nextUserId: pos.id !== userId ? pos.id : undefined,
      nextValue: pos.id !== userId ? pos.value : undefined,
    });
  }

  return ret;
}

export const allBait = bikkieDerived("allBait", () => {
  const items = getBiscuits("/items");
  const bait = items.filter((item) => item.isBait);
  return sortBy(bait, (bait) => bait.displayName);
});

export const allFishingRods = bikkieDerived("allFishingRods", () => {
  const tools = getBiscuits("/items/tools");
  const rods = tools.filter((tool) => tool.action === "fish");
  return sortBy(rods, (rod) => rod.hardnessClass);
});

export function canCast(
  resources: ClientResources,
  fishingInfo: FailedFishingInfo
): boolean {
  const secondsSinceEpoch = resources.get("/clock").time;
  const retryDelay = fishingInfo.retryDelay ?? DEFAULT_RETRY_DELAY;
  return secondsSinceEpoch - fishingInfo.start > retryDelay;
}
