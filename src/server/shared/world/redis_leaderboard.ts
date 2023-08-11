import type { BiomesRedis } from "@/server/shared/redis/connection";
import type {
  LeaderboardApi,
  LeaderboardCategory,
  LeaderboardOp,
  LeaderboardOrder,
  LeaderboardPosition,
  LeaderboardValueQuery,
  LeaderboardWindow,
} from "@/server/shared/world/api";
import { keyForWindow, keysForNow } from "@/server/shared/world/leaderboard";
import type { BiomesLuaRedis } from "@/server/shared/world/lua/api";
import {
  biomesIdToRedisKey,
  redisKeyToBiomesId,
} from "@/server/shared/world/types";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import type { ChainableCommander } from "ioredis";

export function leaderboardKey(category: LeaderboardCategory, key: string) {
  return `leaderboard:${category}:${key}`;
}

export function redisUpdateLeaderboardCounters(
  pipeline: ChainableCommander,
  category: LeaderboardCategory,
  op: LeaderboardOp,
  amount: number,
  id: BiomesId
) {
  for (const key of keysForNow()) {
    pipeline.zadd(
      leaderboardKey(category, key),
      op,
      amount ?? 1,
      biomesIdToRedisKey(id)
    );
  }
}

export class RedisLeaderboard implements LeaderboardApi {
  constructor(private readonly redis: BiomesRedis<BiomesLuaRedis>) {}

  async clear(
    category: LeaderboardCategory,
    window: "daily" | "thisWeek" | "alltime",
    result?: BiomesId
  ): Promise<void> {
    const lk = leaderboardKey(category, keyForWindow(window));
    if (result) {
      await this.redis.primary.zrem(lk, biomesIdToRedisKey(result));
    } else {
      await this.redis.primary.del(lk);
    }
  }

  async record(
    category: LeaderboardCategory,
    op: LeaderboardOp,
    id: BiomesId,
    amount?: number | undefined
  ): Promise<void> {
    const pipeline = this.redis.primary.multi();
    redisUpdateLeaderboardCounters(pipeline, category, op, amount ?? 1, id);
    await pipeline.exec();
  }

  async get(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    limit: number | undefined
  ): Promise<Array<LeaderboardPosition>> {
    const lk = leaderboardKey(category, keyForWindow(window));
    const trueLimit = Math.max(1, limit ?? 3) - 1;

    const results = await (order === "DESC"
      ? this.redis.replica.zrange(lk, 0, trueLimit, "REV", "WITHSCORES")
      : this.redis.replica.zrange(lk, 0, trueLimit, "WITHSCORES"));
    const output: LeaderboardPosition[] = [];
    for (let i = 0; i < results.length; i += 2) {
      output.push({
        id: redisKeyToBiomesId(results[i]),
        rank: i / 2,
        value: parseFloat(results[i + 1]),
      });
    }
    return output;
  }

  async getAfterScore(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    score: number,
    count: number
  ) {
    ok(count <= 50, "Too many after requested");
    const lbKey = leaderboardKey(category, keyForWindow(window));
    const nearby = await (order === "DESC"
      ? this.redis.replica.zrange(
          lbKey,
          score,
          -Infinity,
          "BYSCORE",
          "REV",
          "LIMIT",
          0,
          count,
          "WITHSCORES"
        )
      : this.redis.replica.zrange(
          lbKey,
          score,
          Infinity,
          "BYSCORE",
          "LIMIT",
          0,
          count,
          "WITHSCORES"
        ));
    ok(nearby.length % 2 === 0);

    let startRank = 0;
    if (nearby.length > 0) {
      startRank = (await this.redis.replica.zrevrank(lbKey, nearby[0])) ?? 0;
    }

    const ret: LeaderboardPosition[] = [];
    for (let i = 0, rank = startRank; i < nearby.length; i += 2, rank += 1) {
      const id = redisKeyToBiomesId(nearby[i]);
      const value = parseFloat(nearby[i + 1]);
      ret.push({ id, rank, value });
    }
    return ret;
  }

  async getNearby(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    id: BiomesId,
    aboveCount: number,
    belowCount: number
  ) {
    ok(aboveCount >= 0 && aboveCount <= 50, "Too many above requested");
    ok(belowCount >= 0 && belowCount <= 50, "Too many below requested");
    const rank = await (order === "DESC"
      ? this.redis.replica.zrevrank(
          leaderboardKey(category, keyForWindow(window)),
          biomesIdToRedisKey(id)
        )
      : this.redis.replica.zrank(
          leaderboardKey(category, keyForWindow(window)),
          biomesIdToRedisKey(id)
        ));

    if (rank === null) {
      return undefined;
    }

    const start = Math.max(0, rank - aboveCount);
    const limit = rank + belowCount;
    const nearby = await (order === "DESC"
      ? this.redis.replica.zrange(
          leaderboardKey(category, keyForWindow(window)),
          start,
          limit,
          "REV",
          "WITHSCORES"
        )
      : this.redis.replica.zrange(
          leaderboardKey(category, keyForWindow(window)),
          start,
          limit,
          "WITHSCORES"
        ));

    ok(nearby.length % 2 === 0);

    const ret: LeaderboardPosition[] = [];
    for (let i = 0, rank = start; i < nearby.length; i += 2, rank += 1) {
      const id = redisKeyToBiomesId(nearby[i]);
      const value = parseFloat(nearby[i + 1]);
      ret.push({ id, rank, value });
    }
    return ret;
  }

  async getValues(
    queries: LeaderboardValueQuery[]
  ): Promise<Array<LeaderboardPosition | undefined>> {
    if (queries.length === 0) {
      return [];
    }

    let pipeline = this.redis.replica.multi();

    for (const query of queries) {
      const lbKey = leaderboardKey(query.category, keyForWindow(query.window));
      if (query.order === "DESC") {
        pipeline = pipeline.zrevrank(lbKey, biomesIdToRedisKey(query.id));
      } else {
        pipeline = pipeline.zrank(lbKey, biomesIdToRedisKey(query.id));
      }

      pipeline = pipeline.zscore(lbKey, biomesIdToRedisKey(query.id));
    }

    const results = await pipeline.exec();
    if (!results) {
      throw new Error("Null results");
    }
    ok(results.length == queries.length * 2);
    const ret: (LeaderboardPosition | undefined)[] = [];
    for (let i = 0; i < queries.length; i += 1) {
      const id = queries[i].id;
      const rank = results[i * 2][1] as string | null | undefined;
      const value = results[i * 2 + 1][1] as string | null | undefined;

      if (
        (typeof rank !== "number" && !rank) ||
        (typeof value !== "number" && !value)
      ) {
        ret.push(undefined);
      } else {
        ret.push({
          id,
          rank: parseInt(rank, 10),
          value: parseFloat(value),
        });
      }
    }

    return ret;
  }
}
