import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import type { LeaderboardPosition } from "@/server/shared/world/api";
import type { RedisWorld } from "@/server/shared/world/redis";
import type { RedisWorldTestHelper } from "@/server/shared/world/test/test_helpers";
import {
  fishItemWithLength,
  redisBeforeEachTest,
  runRedis,
  TEST_ID,
} from "@/server/shared/world/test/test_helpers";
import type { ChangeToApply } from "@/shared/api/transaction";
import { BikkieIds } from "@/shared/bikkie/ids";
import { GrabBag, Position } from "@/shared/ecs/gen/components";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

//
// Important Note! These tests only run if env.REDIS_TESTS=1
//
describe("Redis Apply Tests", () => {
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
  let helper!: RedisWorldTestHelper;

  beforeEach(async () => {
    [, world, helper] = await redisBeforeEachTest(port);
  });

  afterEach(async () => world?.stop());

  it("Can create", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "zip",
      },
    });

    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        label: {
          text: "zip",
        },
      },
      [
        43,
        {
          "37": 43,
        },
        {
          "37": "\x01\x91£zip",
        },
      ],
    ]);
  });

  it("Can create on top of existing", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "zip",
      },
    });
    await helper.applyChanges({
      kind: "create",
      entity: {
        id: TEST_ID,
        remote_connection: {},
      },
    });
    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        remote_connection: {},
      },
      [
        44,
        {
          "31": 44,
          "37": 44,
        },
        {
          "31": "\x01\x90",
        },
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Can update on top of existing", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "zip",
      },
    });
    await helper.applyChanges({
      kind: "update",
      entity: {
        id: TEST_ID,
        label: {
          text: "zap",
        },
      },
    });
    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        label: {
          text: "zap",
        },
      },
      [
        44,
        {
          "37": 44,
        },
        {
          "37": "\x01\x91£zap",
        },
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Can delete components", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "zip",
      },
    });
    await helper.applyChanges({
      kind: "update",
      entity: {
        id: TEST_ID,
        label: null,
        remote_connection: {},
      },
    });
    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        remote_connection: {},
      },
      [
        44,
        {
          "31": 44,
          "37": 44,
        },
        {
          "31": "\x01\x90",
        },
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Can delete", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "zip",
      },
    });
    await helper.applyChanges({
      kind: "delete",
      id: TEST_ID,
    });
    assert.deepEqual(await helper.getEntityAndState(), [
      undefined,
      [
        44,
        {
          "37": 44,
        },
        0,
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Can create ontop of a deleted entity", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "zip",
      },
    });
    await helper.applyChanges({
      kind: "delete",
      id: TEST_ID,
    });
    await helper.applyChanges({
      kind: "update",
      entity: {
        id: TEST_ID,
        position: {
          v: [1, 2, 3],
        },
      },
    });
    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        position: {
          v: [1, 2, 3],
        },
      },
      [
        45,
        {
          "37": 44,
          "54": 45,
        },
        {
          "54": "\x01\x91\x93\x01\x02\x03",
        },
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 45);
  });

  it("Can recreate asserting non-existence", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "zip",
      },
    });
    await helper.applyChanges({
      kind: "delete",
      id: TEST_ID,
    });
    assert.ok(
      await helper.applyTransaction({
        iffs: [[TEST_ID, 0]],
        changes: [
          {
            kind: "create",
            entity: {
              id: TEST_ID,
              position: {
                v: [1, 2, 3],
              },
            },
          },
        ],
      })
    );
    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        position: {
          v: [1, 2, 3],
        },
      },
      [
        45,
        {
          "37": 44,
          "54": 45,
        },
        {
          "54": "\x01\x91\x93\x01\x02\x03",
        },
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 45);
  });

  it("Fails transaction due to non-existence", async () => {
    await helper.createEntity({
      id: TEST_ID,
      position: Position.create({ v: [1, 2, 3] }),
    });
    await helper.applyChanges({
      kind: "delete",
      id: TEST_ID,
    });
    assert.ok(
      !(await helper.applyTransaction({
        iffs: [[TEST_ID]],
        changes: [
          {
            kind: "update",
            entity: {
              id: TEST_ID,
              position: {
                v: [4, 5, 6],
              },
            },
          },
        ],
      }))
    );
    assert.deepEqual(await helper.getEntityAndState(), [
      undefined,
      [
        44,
        {
          "54": 44,
        },
        0,
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Fails transaction due to primary version", async () => {
    await helper.createEntity({
      id: TEST_ID,
      position: Position.create({ v: [1, 2, 3] }),
    });
    await helper.applyChanges({
      kind: "update",
      entity: {
        id: TEST_ID,
        position: Position.create({ v: [4, 5, 6] }),
      },
    });
    assert.ok(
      !(await helper.applyTransaction({
        iffs: [[TEST_ID, 43]],
        changes: [
          {
            kind: "update",
            entity: {
              id: TEST_ID,
              position: {
                v: [7, 8, 9],
              },
            },
          },
        ],
      }))
    );
    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        position: Position.create({ v: [4, 5, 6] }),
      },
      [
        44,
        {
          "54": 44,
        },
        {
          "54": "\x01\x91\x93\x04\x05\x06",
        },
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Fails transaction due to component version", async () => {
    await helper.createEntity({
      id: TEST_ID,
      position: Position.create({ v: [1, 2, 3] }),
    });
    await helper.applyChanges({
      kind: "update",
      entity: {
        id: TEST_ID,
        position: Position.create({ v: [4, 5, 6] }),
      },
    });
    assert.ok(
      !(await helper.applyTransaction({
        iffs: [[TEST_ID, 43, 54]],
        changes: [
          {
            kind: "update",
            entity: {
              id: TEST_ID,
              position: {
                v: [7, 8, 9],
              },
            },
          },
        ],
      }))
    );
    assert.deepEqual(await helper.getEntityAndState(), [
      {
        id: TEST_ID,
        position: Position.create({ v: [4, 5, 6] }),
      },
      [
        44,
        {
          "54": 44,
        },
        {
          "54": "\x01\x91\x93\x04\x05\x06",
        },
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Drop component position update past expiry", async () => {
    await helper.createEntity({
      id: TEST_ID,
      grab_bag: GrabBag.create(),
      position: Position.create({ v: [1, 2, 3] }),
    });
    await helper.applyChanges({
      kind: "delete",
      id: TEST_ID,
    });
    assert.ok(
      !(await helper.applyTransaction({
        // Assert the grab bag component was unchanged.
        iffs: [[TEST_ID, 5, 51]],
        changes: [
          {
            kind: "update",
            entity: {
              id: TEST_ID,
              position: {
                v: [4, 5, 6],
              },
            },
          },
        ],
      }))
    );
    assert.deepEqual(await helper.getEntityAndState(), [
      undefined,
      [
        44,
        {
          "51": 44,
          "54": 44,
        },
        0,
      ],
    ]);
    assert.deepEqual(await helper.getTick(), 44);
  });

  it("Responds with expected eager changes", async () => {
    await helper.createEntity({
      id: TEST_ID,
      label: {
        text: "hello world",
      },
    });

    const { outcome, changes: lazyChanges } = await world.apply({
      catchups: [[TEST_ID, 0]],
    });
    assert.deepEqual(outcome, "success");
    assert.deepEqual(
      lazyChanges.map((c) => materializeLazyChange(c)),
      [
        {
          kind: "create",
          tick: 43,
          entity: {
            id: TEST_ID,
            label: {
              text: "hello world",
            },
          },
        },
      ]
    );
  });

  it("Appropriately increments leaderboards", async () => {
    const ID_A = 1231 as BiomesId;
    const ID_B = 5646 as BiomesId;
    await world.apply(<ChangeToApply>{
      events: [
        {
          kind: "place",
          entityId: ID_A,
          item: anItem(BikkieIds.dirt),
          position: [0, 0, 0],
        },
        {
          kind: "place",
          entityId: ID_B,
          item: anItem(BikkieIds.dirt),
          position: [0, 0, 0],
        },
        {
          kind: "place",
          entityId: ID_B,
          item: anItem(BikkieIds.dirt),
          position: [0, 0, 0],
        },
      ],
    });

    const leaderboard = world.leaderboard();
    assert.deepEqual(
      (
        await leaderboard.getValues([
          {
            category: "ecs:place",
            window: "alltime",
            order: "DESC",
            id: ID_B,
          },
        ])
      )[0]?.value,
      2
    );
    assert.deepEqual(
      (
        await leaderboard.getValues([
          {
            category: "ecs:place",
            window: "alltime",
            id: TEST_ID,
            order: "DESC",
          },
        ])
      )[0],
      undefined
    );

    const expectedLeaderboard: Array<LeaderboardPosition> = [
      { id: ID_B, rank: 0, value: 2 },
      {
        id: ID_A,
        rank: 1,
        value: 1,
      },
    ];
    assert.deepEqual(
      await leaderboard.get("ecs:place", "alltime", "DESC", 100),
      expectedLeaderboard
    );
    assert.deepEqual(
      await leaderboard.get("ecs:place", "daily", "DESC", 100),
      expectedLeaderboard
    );
  });

  it("Can represent double-valued leaderboard values", async () => {
    const FISHER = 1231 as BiomesId;
    await fishItemWithLength(world, FISHER, BikkieIds.bigeye_tuna, 1.2);
    await fishItemWithLength(world, FISHER, BikkieIds.bigeye_tuna, 3.4);
    await fishItemWithLength(world, FISHER, BikkieIds.bigeye_tuna, 2.3);
    const leaderboard = world.leaderboard();
    assert.deepEqual(
      (
        await leaderboard.getValues([
          {
            category: "ecs:fished:maxLength",
            window: "alltime",
            id: FISHER,
            order: "DESC",
          },
        ])
      )[0]?.value,
      3.4
    );
  });

  it("Appropriately can perform aggregate max over leaderboard", async () => {
    const FISHER = 1231 as BiomesId;
    await fishItemWithLength(world, FISHER, BikkieIds.bigeye_tuna, 1.0);
    let leaderboard = world.leaderboard();
    assert.deepEqual(
      (
        await leaderboard.getValues([
          {
            category: "ecs:fished:maxLength",
            window: "alltime",
            id: FISHER,
            order: "DESC",
          },
        ])
      )[0]?.value,
      1.0
    );

    await fishItemWithLength(world, FISHER, BikkieIds.bigeye_tuna, 2.0);
    leaderboard = world.leaderboard();
    assert.deepEqual(
      (
        await leaderboard.getValues([
          {
            category: "ecs:fished:maxLength",
            window: "alltime",
            id: FISHER,
            order: "DESC",
          },
        ])
      )[0]?.value,
      2.0
    );
    await fishItemWithLength(world, FISHER, BikkieIds.bigeye_tuna, 1.5);
    leaderboard = world.leaderboard();
    assert.deepEqual(
      (
        await leaderboard.getValues([
          {
            category: "ecs:fished:maxLength",
            window: "alltime",
            id: FISHER,
            order: "DESC",
          },
        ])
      )[0]?.value,
      2.0
    );
    assert.deepEqual(
      (
        await leaderboard.getValues([
          {
            category: `ecs:fished:${BikkieIds.bigeye_tuna}:maxLength`,
            window: "alltime",
            id: FISHER,
            order: "DESC",
          },
        ])
      )[0]?.value,
      2.0
    );
  });
});
