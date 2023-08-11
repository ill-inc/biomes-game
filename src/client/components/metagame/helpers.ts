import type { BiomesId } from "@/shared/ids";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { RequestLeaderboard } from "@/pages/api/social/leaderboard_nearby_values";
import {
  useCachedLeaderboardGetAfter,
  useCachedLeaderboardValue,
} from "@/client/util/social_manager_hooks";
import type { LeaderboardPosition } from "@/server/shared/world/api";
import { useInterval } from "@/client/util/intervals";
import { useEffect, useState } from "react";

export type MetagameGroup = "individual" | "team";

export function useMetagameLeaderboard(
  metagameId: BiomesId,
  group: MetagameGroup
): (LeaderboardPosition | undefined)[] {
  const { reactResources, socialManager, userId } = useClientContext();
  const [_version, setVersion] = useState(0);

  const leaderboardRequest: RequestLeaderboard = {
    kind: group === "individual" ? "metagame" : "metagame:team",
    id: metagameId,
  };

  // Invalidate top player cache every minute
  useInterval(() => {
    socialManager.eagerInvalidateLeaderboard(userId, leaderboardRequest);
    setVersion((v) => v + 1);
  }, 60 * 1000);
  // Invalidate user cache every time their challenge component changes
  const _challenges = reactResources.use("/ecs/c/challenges", userId);
  const challengesVersion = reactResources.version("/ecs/c/challenges", userId);
  useEffect(() => {
    socialManager.eagerInvalidateLeaderboard(userId, leaderboardRequest);
  }, [challengesVersion, setVersion]);

  const topPlayers = useCachedLeaderboardGetAfter(
    socialManager,
    leaderboardRequest,
    "alltime",
    "DESC"
  );
  const curPlayer = useCachedLeaderboardValue(
    socialManager,
    userId,
    leaderboardRequest,
    "alltime",
    "DESC"
  );

  const topRanks = new Set(topPlayers?.map((p) => p?.rank));
  const combined: (LeaderboardPosition | undefined)[] =
    topPlayers?.slice() || [];
  const slots = socialManager.cachedLeaderboardGetAfterLimit();
  if (curPlayer && !topRanks.has(curPlayer.rank)) {
    if (combined.length >= slots) {
      combined.pop();
    }
    combined.push(curPlayer);
  }
  if (combined.length < socialManager.cachedLeaderboardGetAfterLimit()) {
    combined.push(
      ...[...Array(Math.max(0, slots - combined.length))].map(() => undefined)
    );
  }
  return combined;
}
