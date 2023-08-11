import type { LogicTable } from "@/server/logic/ecs";
import { createLogicTable } from "@/server/logic/ecs";
import type { FinalizedChangeSet } from "@/server/logic/events/context/change_set";
import { ChangeSet } from "@/server/logic/events/context/change_set";
import { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { BikkieIds } from "@/shared/bikkie/ids";
import { Label } from "@/shared/ecs/gen/components";
import type { DeltaPatch } from "@/shared/ecs/gen/delta";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type { AnyEvent } from "@/shared/ecs/gen/events";
import { countOf, createBag } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert, { ok } from "assert";

const ID_A = 41 as BiomesId;
const ID_B = 42 as BiomesId;
const ID_C = 43 as BiomesId;

describe("ChangeSet", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let table: LogicTable;
  let source: LogicVersionedEntitySource;
  let changeSet: ChangeSet<AnyEvent>;

  beforeEach(() => {
    table = createLogicTable();
    table.apply([
      {
        kind: "create",
        tick: 24,
        entity: { id: ID_B },
      },
      {
        kind: "create",
        tick: 34,
        entity: { id: ID_C },
      },
    ]);
    source = new LogicVersionedEntitySource(voxeloo, table);
    changeSet = new ChangeSet(source);
  });

  it("Generates nothing when empty", () => {
    assert.deepEqual(changeSet.build(), undefined);
  });

  it("Handles a combination of actions", () => {
    changeSet.get("none", ID_C);
    changeSet.delete(ID_A);
    changeSet.create(new PatchableEntity({ id: ID_B }));
    changeSet.publish([
      {
        kind: "collect",
        entityId: ID_A,
        bag: itemBagToString(createBag(countOf(BikkieIds.dirt, 1n))),
        mined: true,
      },
    ]);

    assert.deepEqual(changeSet.build(), <FinalizedChangeSet<AnyEvent>>{
      handled: [],
      usedIds: new Set([ID_B]),
      transaction: {
        iffs: [[ID_B, 0]],
        catchups: [[ID_C, 34]],
        changes: [
          {
            id: ID_A,
            kind: "delete",
          },
          {
            kind: "create",
            entity: {
              id: ID_B,
            },
          },
        ],
        events: [
          {
            kind: "collect",
            bag: '[["4537020877770180",{"item":{"id":4537020877770180},"count":"1"}]]',
            entityId: ID_A,
            mined: true,
          },
        ],
      },
    });
  });

  it("Gives priority to deletes over updates", () => {
    const [, entity] = changeSet.get("none", ID_B);
    ok(entity);
    entity.setPosition({ v: [1, 2, 3] });
    (entity as DeltaPatch).commit();
    changeSet.delete(ID_B);

    assert.deepEqual(changeSet.build(), <FinalizedChangeSet<AnyEvent>>{
      handled: [],
      usedIds: new Set(),
      transaction: {
        iffs: [],
        catchups: [[ID_B, 24]],
        changes: [
          {
            id: ID_B,
            kind: "delete",
          },
        ],
        events: [],
      },
    });
  });

  it("Generates component-wise transactions", () => {
    const [versionB, deltaB] = changeSet.get("none", ID_B);
    ok(deltaB);
    deltaB.mutableLabel().text = "Hello";
    (deltaB as DeltaPatch).commit();
    const [, deltaC] = changeSet.get("none", ID_C);
    ok(deltaC);
    deltaC.setLabel({ text: "Goodbye" });
    (deltaC as DeltaPatch).commit();

    assert.deepEqual(changeSet.build(), <FinalizedChangeSet<AnyEvent>>{
      handled: [],
      usedIds: new Set(),
      transaction: {
        iffs: [[ID_B, versionB, Label.ID]],
        catchups: [[ID_C, 34]],
        changes: [
          {
            kind: "update",
            entity: {
              id: ID_B,
              label: { text: "Hello" },
            },
          },
          {
            kind: "update",
            entity: {
              id: ID_C,
              label: { text: "Goodbye" },
            },
          },
        ],
        events: [],
      },
    });
  });
});
