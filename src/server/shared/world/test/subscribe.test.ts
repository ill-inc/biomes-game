import type { EntityFilter } from "@/server/shared/ecs/filter";
import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import type { RedisWorld } from "@/server/shared/world/redis";
import type { RedisWorldTestHelper } from "@/server/shared/world/test/test_helpers";
import {
  redisBeforeEachTest,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import type { ReadonlyProposedChanges } from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { createTable } from "@/shared/ecs/table";
import type { BiomesId } from "@/shared/ids";
import { ConditionVariable, Latch } from "@/shared/util/async";
import assert from "assert";

//
// Important Note! These tests only run if env.REDIS_TESTS=1
//
describe("Redis Subscribe Tests", () => {
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

  afterEach(async () => {
    await world.stop();
  });

  it("Subscribes", async () => {
    const ID_A = 123 as BiomesId;
    const ID_B = 456 as BiomesId;
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

    const table = createTable({});
    const bootstrapped = new Latch();
    const permitStreaming = new ConditionVariable();
    const streamingUpdate = new ConditionVariable();
    void (async () => {
      for await (const update of world.subscribe()) {
        table.apply(update.changes.map((c) => materializeLazyChange(c)));
        if (update.bootstrapped) {
          bootstrapped.signal();
          await permitStreaming.wait();
        } else if (bootstrapped.signalled) {
          streamingUpdate.signal();
        }
      }
    })();

    // Wait for bootstrap.
    await bootstrapped.wait();

    // Assert table is as expected.
    assert.deepEqual(table.recordSize, 2);
    assert.deepEqual(table.get(ID_A)?.label?.text, "Alice");
    assert.deepEqual(table.get(ID_B)?.label?.text, "Bob");

    // Do another change.
    await helper.applyChanges({
      kind: "update",
      entity: {
        id: ID_A,
        label: {
          text: "Formerly Known As Alice",
        },
      },
    });

    // Permit streaming forward.
    permitStreaming.signal();
    await streamingUpdate.wait();

    assert.deepEqual(table.recordSize, 2);
    assert.deepEqual(table.get(ID_A)?.label?.text, "Formerly Known As Alice");
    assert.deepEqual(table.get(ID_B)?.label?.text, "Bob");
  });

  const filterContextTest = async (
    bootstrapEntities: ReadonlyEntity[],
    filter: EntityFilter,
    changes: ReadonlyProposedChanges,
    expectedEntities: ReadonlyEntity[]
  ) => {
    await helper.createEntity(...bootstrapEntities);

    const table = createTable({});
    const bootstrapped = new Latch();
    const permitStreaming = new ConditionVariable();
    const streamingUpdate = new ConditionVariable();
    void (async () => {
      for await (const update of world.subscribe({
        filter,
      })) {
        table.apply(update.changes.map((c) => materializeLazyChange(c)));
        if (update.bootstrapped) {
          bootstrapped.signal();
          await permitStreaming.wait();
        } else if (bootstrapped.signalled) {
          streamingUpdate.signal();
        }
      }
    })();

    await bootstrapped.wait();
    if (changes.length > 0) {
      await helper.applyChanges(...changes);
      permitStreaming.signal();
      await streamingUpdate.wait();
    } else {
      permitStreaming.signal();
    }
    assert.equal(table.recordSize, expectedEntities.length);
    for (const expectedEntity of expectedEntities) {
      const tableEntity = table.get(expectedEntity.id);
      assert.deepEqual(tableEntity, expectedEntity);
    }
  };

  const ID_A = 1 as BiomesId;
  const ID_B = 2 as BiomesId;
  const ID_C = 3 as BiomesId;
  const ID_D = 4 as BiomesId;

  it("single bootstrap empty filter", async () => {
    await filterContextTest(
      [{ id: ID_A, position: { v: [0, 0, 0] } }],
      {},
      [],
      [{ id: ID_A, position: { v: [0, 0, 0] } }]
    );
  });
  it("single bootstrap require reject", async () => {
    await filterContextTest(
      [{ id: ID_A, position: { v: [0, 0, 0] } }],
      { anyOf: ["remote_connection"] },
      [],
      []
    );
  });
  it("single bootstrap require pass", async () => {
    await filterContextTest(
      [{ id: ID_A, remote_connection: {} }],
      { anyOf: ["remote_connection"] },
      [],
      [{ id: ID_A, remote_connection: {} }]
    );
  });
  it("single create require pass", async () => {
    await filterContextTest(
      [],
      { anyOf: ["remote_connection"] },
      [
        {
          kind: "create",
          entity: { id: ID_A, remote_connection: {} },
        },
      ],
      [{ id: ID_A, remote_connection: {} }]
    );
  });
  it("single create require reject", async () => {
    await filterContextTest(
      [],
      { anyOf: ["remote_connection"] },
      [
        {
          kind: "create",
          entity: { id: ID_A, position: { v: [0, 0, 0] } },
        },
      ],
      []
    );
  });
  it("two bootstrap two create require some pass", async () => {
    await filterContextTest(
      [
        { id: ID_A, position: { v: [0, 0, 0] } },
        { id: ID_B, remote_connection: {} },
      ],
      { anyOf: ["remote_connection"] },
      [
        {
          kind: "create",
          entity: { id: ID_C, position: { v: [0, 0, 0] } },
        },
        {
          kind: "create",
          entity: { id: ID_D, remote_connection: {} },
        },
      ],
      [
        { id: ID_B, remote_connection: {} },
        { id: ID_D, remote_connection: {} },
      ]
    );
  });
  it("two bootstrap two create deny some pass", async () => {
    await filterContextTest(
      [
        { id: ID_A, position: { v: [0, 0, 0] } },
        { id: ID_B, remote_connection: {} },
      ],
      { noneOf: ["remote_connection"] },
      [
        {
          kind: "create",
          entity: { id: ID_C, position: { v: [0, 0, 0] } },
        },
        {
          kind: "create",
          entity: { id: ID_D, remote_connection: {} },
        },
      ],
      [
        { id: ID_A, position: { v: [0, 0, 0] } },
        { id: ID_C, position: { v: [0, 0, 0] } },
      ]
    );
  });
  it("filtered item becomes unfiltered", async () => {
    await filterContextTest(
      [
        { id: ID_A, position: { v: [0, 0, 0] }, iced: {} },
        { id: ID_B, remote_connection: {} },
      ],
      { noneOf: ["iced"] },
      [
        {
          kind: "update",
          entity: { id: ID_A, iced: null },
        },
        {
          kind: "update",
          entity: { id: ID_B, remote_connection: null },
        },
      ],
      [{ id: ID_A, position: { v: [0, 0, 0] } }, { id: ID_B }]
    );
  });
  it("unfiltered item becomes filtered", async () => {
    await filterContextTest(
      [
        { id: ID_A, position: { v: [0, 0, 0] }, iced: {} },
        { id: ID_B, remote_connection: {} },
      ],
      { noneOf: ["iced"] },
      [
        {
          kind: "update",
          entity: { id: ID_A, position: { v: [0, 0, 1] } },
        },
        {
          kind: "update",
          entity: { id: ID_B, iced: {} },
        },
      ],
      []
    );
  });
  it("delete filtered items", async () => {
    await filterContextTest(
      [
        { id: ID_A, position: { v: [0, 0, 0] }, iced: {} },
        { id: ID_B, remote_connection: {} },
      ],
      { noneOf: ["iced"] },
      [
        {
          kind: "delete",
          id: ID_A,
        },
        {
          kind: "delete",
          id: ID_B,
        },
      ],
      []
    );
  });
  it("deny and requires", async () => {
    await filterContextTest(
      [
        { id: ID_A, label: { text: "A" } },
        { id: ID_B, remote_connection: {} },
        { id: ID_C, remote_connection: {}, label: { text: "C" } },
      ],
      { anyOf: ["remote_connection"], noneOf: ["label"] },
      [],
      [{ id: ID_B, remote_connection: {} }]
    );
  });
});
