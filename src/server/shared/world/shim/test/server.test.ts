import type { EntityFilter } from "@/server/shared/ecs/filter";
import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import {
  ShimWorldApi,
  ShimWorldService,
  zWorldService,
} from "@/server/shared/world/shim/api";
import { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import { makeClientFromImplementation } from "@/server/shared/zrpc/server";
import type {
  ProposedChange,
  ReadonlyProposedChanges,
} from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { createTable } from "@/shared/ecs/table";
import type { BiomesId } from "@/shared/ids";
import { ConditionVariable, Latch } from "@/shared/util/async";
import assert from "assert";

async function filterContextTest(
  bootstrapEntities: ReadonlyEntity[],
  filter: EntityFilter,
  changes: ReadonlyProposedChanges,
  expectedEntities: ReadonlyEntity[]
) {
  const world = new InMemoryWorld(false);
  world.applyChanges(
    bootstrapEntities.map((e) => ({ kind: "create", entity: e }))
  );

  const worldApi = new ShimWorldApi(
    makeClientFromImplementation(zWorldService, new ShimWorldService(world))
  );

  const table = createTable({});
  const bootstrapped = new Latch();
  const permitStreaming = new ConditionVariable();
  const streamingUpdate = new ConditionVariable();
  const controller = new AbortController();
  void (async () => {
    for await (const update of worldApi.subscribe(
      {
        filter,
      },
      controller.signal
    )) {
      table.apply(update.changes.map((c) => materializeLazyChange(c)));
      if (update.bootstrapped) {
        bootstrapped.signal();
        await permitStreaming.wait();
      } else if (bootstrapped.signalled) {
        streamingUpdate.signal();
      }
    }
  })();

  try {
    await bootstrapped.wait();
    if (changes.length > 0) {
      await worldApi.apply({ changes: changes as ProposedChange[] });
      permitStreaming.signal();
      await streamingUpdate.wait();
    }
    assert.equal(table.recordSize, expectedEntities.length);
    for (const expectedEntity of expectedEntities) {
      const tableEntity = table.get(expectedEntity.id);
      assert.deepEqual(tableEntity, expectedEntity);
    }
  } finally {
    // Help the subscription quit early.
    controller.abort();
  }
}

describe("FilterContext", () => {
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
