import { createLogicTable } from "@/server/logic/ecs";
import type { FinalizedChangeSet } from "@/server/logic/events/context/change_set";
import { ChangeSet } from "@/server/logic/events/context/change_set";
import { ChangeSetForest } from "@/server/logic/events/context/change_set_forest";
import { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { AnyEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { generateTestId } from "@/shared/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

const ID_A = generateTestId();
const ID_B = generateTestId();
const ID_C = generateTestId();
const ID_D = generateTestId();

describe("Change set forest", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  const makeChangeSet = (
    versions: [BiomesId, number][],
    ids: BiomesId[]
  ): ChangeSet<AnyEvent> => {
    const changeSet = new ChangeSet<AnyEvent>(
      new LogicVersionedEntitySource(voxeloo, createLogicTable())
    );
    for (const [id, tick] of versions) {
      changeSet.versionMap.set(id, tick);
    }
    for (const id of ids) {
      changeSet.delete(id);
    }
    return changeSet;
  };

  it("Merges correctly", () => {
    const forest = new ChangeSetForest<AnyEvent>();
    forest.add(makeChangeSet([], [ID_A]));
    forest.add(makeChangeSet([[ID_A, 42]], [ID_A, ID_B]));
    forest.add(makeChangeSet([[ID_C, 30]], [ID_C]));
    forest.add(
      makeChangeSet(
        [
          [ID_B, 30],
          [ID_C, 30],
        ],
        [ID_D]
      )
    );

    assert.deepEqual(forest.build(), <FinalizedChangeSet<AnyEvent>[]>[
      {
        handled: [],
        usedIds: new Set(),
        transaction: {
          iffs: [],
          catchups: [],
          changes: [
            {
              id: ID_A,
              kind: "delete",
            },
          ],
          events: [],
        },
      },
      {
        handled: [],
        usedIds: new Set(),
        transaction: {
          iffs: [],
          catchups: [[ID_A, 42]],
          changes: [
            {
              id: ID_A,
              kind: "delete",
            },
            {
              id: ID_B,
              kind: "delete",
            },
          ],
          events: [],
        },
      },
      {
        handled: [],
        usedIds: new Set(),
        transaction: {
          iffs: [],
          catchups: [
            [ID_B, 30],
            [ID_C, 30],
          ],
          changes: [
            {
              id: ID_D,
              kind: "delete",
            },
            {
              id: ID_C,
              kind: "delete",
            },
          ],
          events: [],
        },
      },
    ]);
  });
});
