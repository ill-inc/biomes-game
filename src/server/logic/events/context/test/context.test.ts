import { createLogicTable } from "@/server/logic/ecs";
import { EventBatchContext } from "@/server/logic/events/context/batch_context";
import { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import { makeEventHandler } from "@/server/logic/events/core";
import type { WorkByHandler } from "@/server/logic/events/grouping";
import { newPlayer } from "@/server/logic/utils/players";
import { IdPoolGenerator } from "@/server/shared/ids/pool";
import { TestIdGenerator } from "@/server/shared/ids/test_helpers";
import type { EventSet } from "@/shared/ecs/gen/events";
import { PickUpEvent } from "@/shared/ecs/gen/events";

import { IdPoolLoan } from "@/server/shared/ids/pool";

import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

const ID_A = 41 as BiomesId;

describe("Events context", () => {
  const idPool = new IdPoolGenerator(new TestIdGenerator(), () => 10);

  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  it("Handles the same entity being requested twice in the one handler", async () => {
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
    ]);

    const testHandler = makeEventHandler("pickUpEvent", {
      involves: (e) => ({ a: e.id, b: e.id }),
      apply: ({ a, b }) => {
        a.mutableLabel().text = "A";
        a.setPosition({ v: [1, 2, 3] });

        assert.equal(b.label()?.text, "A");
        b.mutableLabel().text = "B";
        b.setOrientation({ v: [4, 5] });
      },
    });

    const testEvent = new PickUpEvent({ id: ID_A });

    const work = new Map<keyof EventSet, WorkByHandler>();
    work.set("pickUpEvent", [testHandler, [testEvent]]);

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
    assert.deepEqual(proposal.handled, [testEvent]);
    assert.deepEqual(proposal.usedIds, new Set());

    assert.deepEqual(proposal.transaction.changes, [
      {
        kind: "update",
        entity: {
          id: 41,
          label: {
            text: "B",
          },
          orientation: {
            v: [4, 5],
          },
          position: {
            v: [1, 2, 3],
          },
        },
      },
    ]);
  });
});
