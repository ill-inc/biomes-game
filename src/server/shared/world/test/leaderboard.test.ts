//
// Important Note! These tests only run if env.REDIS_TESTS=1

import type { LeaderboardPosition } from "@/server/shared/world/api";
import type { RedisWorld } from "@/server/shared/world/redis";
import {
  fishItemWithLength,
  redisBeforeEachTest,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

//
describe("Redis Leaderboard Tests", () => {
  if (process.env.REDIS_TESTS !== "1") {
    it("are being skipped as we lack env.REDIS_TESTS=1", () => {
      assert.ok(true);
    });
    return;
  }

  let port!: number;
  let controller!: AbortController;

  after(async () => {
    controller?.abort();
  });

  before(async () => {
    [port, controller] = await runRedis();
  });

  let world!: RedisWorld;

  beforeEach(async () => {
    [, world] = await redisBeforeEachTest(port);
  });

  afterEach(async () => world?.stop());

  const maxLengthKey = "ecs:fished:maxLength";

  it("Should allow empty 'get after' queries", async () => {
    assert.deepEqual(
      await world
        .leaderboard()
        .getAfterScore(maxLengthKey, "alltime", "DESC", 1.0, 10),
      []
    );
  });

  it("Should correctly return 'get after' query values", async () => {
    for (let i = 0; i < 10; i++) {
      await fishItemWithLength(
        world,
        i as BiomesId,
        BikkieIds.bigeye_tuna,
        10.0 + i
      );
    }

    const res = await world
      .leaderboard()
      .getAfterScore(maxLengthKey, "alltime", "DESC", 16.0, 3);

    assert.deepEqual(
      res.map((e) => e.id),
      [6, 5, 4]
    );

    assert.deepEqual(
      res.map((e) => e.value),
      [16, 15, 14]
    );
    assert.deepEqual(
      res.map((e) => e.rank),
      [3, 4, 5]
    );
  });

  it("Should correctly return 'get nearby' query values", async () => {
    for (let i = 0; i < 10; i++) {
      await fishItemWithLength(
        world,
        i as BiomesId,
        BikkieIds.bigeye_tuna,
        10.0 + i
      );
    }

    const res = await world
      .leaderboard()
      .getNearby(maxLengthKey, "alltime", "DESC", 6 as BiomesId, 1, 2);

    assert.ok(res);

    assert.deepEqual(
      res.map((e) => e.id),
      [7, 6, 5, 4]
    );

    assert.deepEqual(
      res.map((e) => e.value),
      [17, 16, 15, 14]
    );
    assert.deepEqual(
      res.map((e) => e.rank),
      [2, 3, 4, 5]
    );

    const resReverse = await world
      .leaderboard()
      .getNearby(maxLengthKey, "alltime", "ASC", 6 as BiomesId, 1, 2);

    assert.ok(resReverse);

    assert.deepEqual(
      resReverse.map((e) => e.id),
      [5, 6, 7, 8]
    );

    assert.deepEqual(
      resReverse.map((e) => e.value),
      [15, 16, 17, 18]
    );
    assert.deepEqual(
      resReverse.map((e) => e.rank),
      [5, 6, 7, 8]
    );

    assert.equal(
      undefined,
      await world
        .leaderboard()
        .getNearby(maxLengthKey, "alltime", "DESC", 1000 as BiomesId, 1, 2)
    );
  });

  it("Should handle multi get nulls", async () => {
    await fishItemWithLength(world, 1 as BiomesId, BikkieIds.bigeye_tuna, 10.0);
    const res = await world.leaderboard().getValues([
      {
        category: maxLengthKey,
        window: "alltime",
        order: "DESC",
        id: 13413 as BiomesId,
      },
      {
        category: maxLengthKey,
        window: "alltime",
        order: "DESC",
        id: 1 as BiomesId,
      },
      {
        category: maxLengthKey,
        window: "alltime",
        order: "DESC",
        id: 41343 as BiomesId,
      },
    ]);

    assert.equal(res.length, 3);
    assert.ok(!res[0]);
    assert.ok(res[1]);
    assert.ok(!res[2]);
  });

  it("Should handle multi gets", async () => {
    for (let i = 1; i < 10; i++) {
      await fishItemWithLength(
        world,
        i as BiomesId,
        BikkieIds.bigeye_tuna,
        10.0 - i
      );
    }

    const res = await world.leaderboard().getValues([
      {
        category: maxLengthKey,
        window: "alltime",
        order: "DESC",
        id: 1 as BiomesId,
      },
      {
        category: maxLengthKey,
        window: "alltime",
        order: "ASC",
        id: 1 as BiomesId,
      },
      {
        category: maxLengthKey,
        window: "alltime",
        order: "DESC",
        id: 2 as BiomesId,
      },
      {
        category: maxLengthKey,
        window: "alltime",
        order: "DESC",
        id: 3 as BiomesId,
      },
    ]);

    assert.deepEqual(res, <Array<LeaderboardPosition>>[
      {
        id: 1 as BiomesId,
        rank: 0,
        value: 9.0,
      },
      {
        id: 1 as BiomesId,
        rank: 8,
        value: 9.0,
      },
      {
        id: 2 as BiomesId,
        rank: 1,
        value: 8.0,
      },
      {
        id: 3 as BiomesId,
        rank: 2,
        value: 7.0,
      },
    ]);
  });
});
