import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import type { RedisWorld } from "@/server/shared/world/redis";
import type { RedisWorldTestHelper } from "@/server/shared/world/test/test_helpers";
import {
  redisBeforeEachTest,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

//
// Important Note! These tests only run if env.REDIS_TESTS=1
//
describe("Redis Get Tests", () => {
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

  let redis!: BiomesRedis;
  let world!: RedisWorld;
  let helper!: RedisWorldTestHelper;

  beforeEach(async () => {
    [redis, world, helper] = await redisBeforeEachTest(port);
  });

  afterEach(async () => {
    await world.stop();
  });

  it("Can do filtered get", async () => {
    const ID_A = 123 as BiomesId;
    const ID_B = 456 as BiomesId;
    const ID_C = 789 as BiomesId;
    await helper.createEntity({
      id: ID_A,
      label: {
        text: "Alice",
      },
    });
    await helper.createEntity({
      id: ID_B,
      label: {
        text: "Bob",
      },
    });

    const lua = await redis.loadLua();

    const results = await lua.primary.ecs.filteredGetSince(
      [
        [ID_A, 0],
        [ID_B, 0],
        [ID_C, 0],
      ],
      undefined
    );

    assert.deepEqual(results.map(materializeLazyChange), [
      {
        entity: {
          id: ID_A,
          label: {
            text: "Alice",
          },
        },
        kind: "update",
        tick: 43,
      },
      {
        entity: {
          id: ID_B,
          label: {
            text: "Bob",
          },
        },
        kind: "update",
        tick: 44,
      },
      {
        id: ID_C,
        kind: "delete",
        tick: 1,
      },
    ]);

    await helper.applyChanges({
      kind: "update",
      entity: {
        id: ID_A,
        label: {
          text: "Formerly Known As Alice",
        },
      },
    });

    const updatedResults = await lua.primary.ecs.filteredGetSince(
      [
        [ID_A, 45],
        [ID_B, 45],
      ],
      undefined
    );

    assert.deepEqual(updatedResults.map(materializeLazyChange), [
      {
        entity: {
          id: ID_A,
          label: {
            text: "Formerly Known As Alice",
          },
        },
        kind: "update",
        tick: 45,
      },
    ]);
  });
});
