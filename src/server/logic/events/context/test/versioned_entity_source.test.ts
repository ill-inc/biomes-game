import type { LogicTable } from "@/server/logic/ecs";
import { createLogicTable } from "@/server/logic/ecs";
import { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import { ByKey } from "@/server/logic/events/query";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import {
  Box,
  ShardDiff,
  ShardSeed,
  ShardShapes,
} from "@/shared/ecs/gen/components";
import type { ShardId } from "@/shared/game/shard";
import { voxelShard } from "@/shared/game/shard";
import { generateTestId } from "@/shared/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

const ID_A = generateTestId();
const ID_B = generateTestId();

describe("Versioned entity source", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let table: LogicTable;
  let source: LogicVersionedEntitySource;

  beforeEach(() => {
    table = createLogicTable();
    table.apply([
      {
        kind: "create",
        tick: 42,
        entity: {
          id: ID_A,
          box: Box.create({ v0: [100, 100, 100], v1: [132, 132, 132] }),
          shard_seed: ShardSeed.create(),
          shard_diff: ShardDiff.create(),
          shard_shapes: ShardShapes.create(),
        },
      },
      {
        kind: "create",
        tick: 45,
        entity: { id: ID_B },
      },
    ]);

    source = new LogicVersionedEntitySource(voxeloo, table);
  });

  it("Can lookup by key", () => {
    assert.deepEqual(
      source.resolveIndexLookup(
        new ByKey("terrainByShardId", "1234" as ShardId)
      ),
      undefined
    );
    assert.deepEqual(
      source.resolveIndexLookup(
        new ByKey("terrainByShardId", voxelShard(110, 110, 110))
      ),
      ID_A
    );
  });

  it("Cannot lookup terrain without specialization", () => {
    assert.throws(() => {
      source.get("none", ID_A);
    });
    const [tick, terrain] = source.get("terrain", ID_A);
    assert.deepEqual(terrain!.id, ID_A);
    assert.deepEqual(tick, 42);
  });

  it("Lookup with version", () => {
    const [tick, entity] = source.get("none", ID_B);
    assert.deepEqual(entity!.id, ID_B);
    assert.deepEqual(tick, 45);
  });
});
