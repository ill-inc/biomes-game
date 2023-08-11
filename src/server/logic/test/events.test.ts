import { createLogicTable } from "@/server/logic/ecs";
import { EventBatchContext } from "@/server/logic/events/context/batch_context";
import { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import type { WorkByHandler } from "@/server/logic/events/grouping";
import { pickUpEventHandler } from "@/server/logic/events/handlers/grab_bags";
import { destroyPlaceableEventHandler } from "@/server/logic/events/handlers/placeables";
import { newDrop } from "@/server/logic/utils/drops";
import { newPlaceable } from "@/server/logic/utils/placeables";
import { newPlayer } from "@/server/logic/utils/players";
import { IdPoolGenerator, IdPoolLoan } from "@/server/shared/ids/pool";
import { TestIdGenerator } from "@/server/shared/ids/test_helpers";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import {
  TestLogicApi,
  createEmptyTerrainShard,
  getAllInventory,
} from "@/server/test/test_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ProposedCreate, ProposedUpdate } from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { EventSet } from "@/shared/ecs/gen/events";
import { DestroyPlaceableEvent, PickUpEvent } from "@/shared/ecs/gen/events";
import { anItem } from "@/shared/game/item";
import { bagCount, countOf } from "@/shared/game/items";
import { SHARD_DIM } from "@/shared/game/shard";
import type { Vec3 } from "@/shared/math/types";
import { generateTestId } from "@/shared/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

describe("Events E2E", () => {
  const idPool = new IdPoolGenerator(new TestIdGenerator(), () => 10);

  const ID_A = generateTestId();
  const ID_B = generateTestId();
  const ID_C = generateTestId();

  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  it("Handles two simultaneous pick-ups", async () => {
    const table = createLogicTable();

    table.apply([
      {
        kind: "create",
        tick: 1,
        entity: {
          ...newPlayer(ID_A, "Alice"),
          position: { v: [0, 0, 0] },
        },
      },
      {
        kind: "create",
        tick: 1,
        entity: {
          ...newPlayer(ID_B, "Bob"),
          position: { v: [0, 0, 0] },
        },
      },
      {
        kind: "create",
        tick: 2,
        entity: newDrop(ID_C, [0, 0, 0], true, [countOf(BikkieIds.dirt, 1n)]),
      },
    ]);

    const pickupA = new PickUpEvent({
      id: ID_A,
      item: ID_C,
    });
    const pickupB = new PickUpEvent({
      id: ID_B,
      item: ID_C,
    });

    const work = new Map<keyof EventSet, WorkByHandler>();
    work.set("pickUpEvent", [pickUpEventHandler, [pickupA, pickupB]]);

    const batchContext = new EventBatchContext(
      voxeloo,
      new LogicVersionedEntitySource(voxeloo, table),
      0
    );
    const [todo] = batchContext.prepareAll(work);
    assert.deepEqual(todo.length, 1);

    const loan = new IdPoolLoan(idPool);
    const proposals = await batchContext.processEvents(loan, todo);

    assert.deepEqual(proposals.length, 1);
    const proposal = proposals[0];
    assert.deepEqual(proposal.handled, [pickupA]);
    assert.deepEqual(proposal.usedIds, new Set());
    assert.deepEqual(proposal.transaction.iffs, [
      [ID_A, 1, 57, 41, 59],
      [ID_C, 2, 57, 51],
    ]);
    assert.deepEqual(proposal.transaction.events, [
      {
        bag: '[["4537020877770180",{"item":{"id":4537020877770180},"count":"1"}]]',
        entityId: ID_A,
        kind: "collect",
        mined: false,
      },
    ]);
    assert.deepEqual(proposal.transaction.changes?.length, 2);
    const [, dropChange] = proposal.transaction.changes as ProposedUpdate[];

    assert.deepEqual(dropChange.kind, "update");
    assert.deepEqual(dropChange.entity.id, ID_C);
    assert.deepEqual(dropChange.entity.acquisition?.acquired_by, ID_A);
  });

  it("Handles two simultaneous pick-ups by one player", async () => {
    const table = createLogicTable();

    table.apply([
      {
        kind: "create",
        tick: 1,
        entity: {
          ...newPlayer(ID_A, "Alice"),
          position: { v: [0, 0, 0] },
        },
      },
      {
        kind: "create",
        tick: 2,
        entity: newDrop(ID_B, [0, 0, 0], true, [countOf(BikkieIds.dirt, 1n)]),
      },
    ]);

    const pickupA = new PickUpEvent({
      id: ID_A,
      item: ID_B,
    });
    const pickupB = new PickUpEvent({
      id: ID_A,
      item: ID_B,
    });

    const work = new Map<keyof EventSet, WorkByHandler>();
    work.set("pickUpEvent", [pickUpEventHandler, [pickupA, pickupB]]);

    const batchContext = new EventBatchContext(
      voxeloo,
      new LogicVersionedEntitySource(voxeloo, table),
      0
    );
    const [todo, todoSize] = batchContext.prepareAll(work);
    assert.deepEqual(todo.length, 1);
    assert.deepEqual(todoSize, 2);

    const loan = new IdPoolLoan(idPool);
    const proposals = await batchContext.processEvents(loan, todo);

    assert.deepEqual(proposals.length, 1);
    const proposal = proposals[0];
    assert.deepEqual(proposal.handled, [pickupA]);
    assert.deepEqual(proposal.usedIds.size, 0);
    assert.deepEqual(proposal.transaction.iffs, [
      [ID_A, 1, 57, 41, 59],
      [ID_B, 2, 57, 51],
    ]);
    assert.deepEqual(proposal.transaction.events, [
      {
        bag: '[["4537020877770180",{"item":{"id":4537020877770180},"count":"1"}]]',
        entityId: ID_A,
        kind: "collect",
        mined: false,
      },
    ]);
    assert.deepEqual(proposal.transaction.changes?.length, 2);
    const [playerChange, dropChange] = proposal.transaction
      .changes as ProposedUpdate[];

    assert.deepEqual(playerChange.kind, "update");
    assert.deepEqual(playerChange.entity.id, ID_A);
    assert.deepEqual(
      bagCount(
        getAllInventory(playerChange.entity as ReadonlyEntity),
        anItem(BikkieIds.dirt)
      ),
      1n
    );

    assert.deepEqual(dropChange.kind, "update");
    assert.deepEqual(dropChange.entity.id, ID_B);
    assert.deepEqual(dropChange.entity.acquisition?.acquired_by, ID_A);

    table.apply(proposal.transaction.changes!.map((c) => ({ ...c, tick: 3 })));

    {
      // Try processing them again, should be a no-op.
      const batchContext = new EventBatchContext(
        voxeloo,
        new LogicVersionedEntitySource(voxeloo, table),
        0
      );
      const [todo] = batchContext.prepareAll(work);
      assert.deepEqual(todo.length, 1);

      const loan = new IdPoolLoan(idPool);
      const proposals = await batchContext.processEvents(loan, todo);
      assert.deepEqual(proposals.length, 0);
    }
  });

  it("Handles two simultaneous placable destroys", async () => {
    const logic = new TestLogicApi(voxeloo);

    for (const involvedShard of [
      [-SHARD_DIM, 0, -SHARD_DIM],
      [-SHARD_DIM, 0, 0],
      [0, 0, -SHARD_DIM],
      [0, 0, 0],
    ] as Array<Vec3>) {
      createEmptyTerrainShard(logic.world, involvedShard);
    }

    logic.world.writeableTable.apply([
      {
        kind: "create",
        tick: 1,
        entity: {
          ...newPlayer(ID_A, "Alice"),
          position: { v: [0, 0, 0] },
        },
      },
      {
        kind: "create",
        tick: 2,
        entity: newPlaceable({
          id: ID_B,
          creatorId: ID_A,
          position: [0, 0, 0],
          orientation: [0, 0],
          item: anItem(BikkieIds.workbench),
        }),
      },
    ]);

    const destroyA = new DestroyPlaceableEvent({
      id: ID_B,
      user_id: ID_A,
    });
    const destroyB = new DestroyPlaceableEvent({
      id: ID_B,
      user_id: ID_A,
    });

    const work = new Map<keyof EventSet, WorkByHandler>();
    work.set("destroyPlaceableEvent", [
      destroyPlaceableEventHandler,
      [destroyA, destroyB],
    ]);

    const batchContext = new EventBatchContext(
      voxeloo,
      new LogicVersionedEntitySource(voxeloo, logic.world.adaptedTable),
      0
    );
    const [todo] = batchContext.prepareAll(work);
    assert.deepEqual(todo.length, 1);

    const loan = new IdPoolLoan(idPool);
    const proposals = await batchContext.processEvents(loan, todo);

    assert.deepEqual(proposals.length, 1);
    const proposal = proposals[0];
    assert.deepEqual(proposal.handled, [destroyA]);
    assert.deepEqual(proposal.usedIds.size, 1);
    assert.deepEqual(proposal.transaction.events, []);
    assert.deepEqual(proposal.transaction.changes?.length, 6);
    const [createChange, deleteChange] = proposal.transaction.changes as (
      | ProposedCreate
      | ProposedUpdate
    )[];

    assert.deepEqual(createChange.kind, "create");
    assert.deepEqual(
      new Set([(createChange as ProposedCreate).entity.id]),
      proposal.usedIds
    );

    assert.deepEqual(deleteChange.kind, "update");
    assert.deepEqual((deleteChange as ProposedUpdate).entity.iced, {});
  });
});
