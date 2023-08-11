import { GameEvent } from "@/server/shared/api/game_event";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import type { EditType } from "@/server/test/test_helpers";
import {
  addGameUser,
  createEditedVoxels,
  createEmptyTerrainShard,
  createRestorationField,
  editEntity,
  TestLogicApi,
  updateInventory,
} from "@/server/test/test_helpers";
import { getTerrainID, isTerrainName } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import { using } from "@/shared/deletable";
import type { Box } from "@/shared/ecs/gen/components";

import {
  CreateGroupEvent,
  DestroyGroupEvent,
  PlaceGroupEvent,
  RestoreGroupEvent,
} from "@/shared/ecs/gen/events";
import { boxToAabb, groupItem, scanGroupTensor } from "@/shared/game/group";
import { toBlockId, toGlassId } from "@/shared/game/ids";
import { anItem } from "@/shared/game/item";
import { addToBag, countOf } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { sub } from "@/shared/math/linear";
import { generateTestId } from "@/shared/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { isGlassGroupEntry } from "@/shared/wasm/types/galois";
import assert, { ok } from "assert";

function grantBling(world: InMemoryWorld, entityId: BiomesId, amount: bigint) {
  editEntity(world, entityId, (entity) => {
    addToBag(
      entity.mutableInventory().currencies,
      countOf(BikkieIds.bling, amount)
    );
  });
}

const TEST_ID = generateTestId();

async function setupGroupTest(voxeloo: VoxelooModule, logic: TestLogicApi) {
  const userId = (
    await addGameUser(logic.world, TEST_ID, {
      position: [0, 0, 0],
    })
  ).id;
  grantBling(logic.world, userId, 10n);
  createEmptyTerrainShard(logic.world, [0, 0, 0]);

  const edits: EditType[] = [
    {
      pos: [25, 25, 25],
      composedOf: anItem(BikkieIds.dirt),
    },
    {
      pos: [26, 25, 25],
      composedOf: anItem(BikkieIds.dirt),
    },
  ];
  createEditedVoxels(voxeloo, logic.world, edits);

  const groupId = generateTestId();
  const box: Box = {
    v0: [25, 25, 25],
    v1: [27, 26, 26],
  };
  const terrainName = anItem(BikkieIds.dirt).terrainName;
  ok(terrainName && isTerrainName(terrainName));
  const terrainID = getTerrainID(terrainName);
  const tensor = using(new voxeloo.GroupTensorBuilder(), (builder) => {
    builder.setBlock(sub([25, 25, 25], box.v0), toBlockId(terrainID), 0, 0, 0);
    builder.setBlock(sub([26, 25, 25], box.v0), toBlockId(terrainID), 0, 0, 0);
    return builder.build().save();
  });

  await logic.publish(
    new GameEvent(
      userId,
      new CreateGroupEvent({
        id: groupId,
        user_id: userId,
        box: box,
        tensor: tensor,
        name: "Test Group",
      })
    )
  );

  return { userId, groupId, tensor, box };
}

describe("Groups", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let logic: TestLogicApi;
  beforeEach(async () => {
    logic = new TestLogicApi(voxeloo);
  });

  it("can be created", async () => {
    const { userId, groupId, tensor } = await setupGroupTest(voxeloo, logic);

    const editsAfterCreate: EditType[] = [
      {
        pos: [25, 25, 25],
        composedOf: anItem(BikkieIds.dirt),
      },
      {
        pos: [26, 25, 25],
        composedOf: anItem(BikkieIds.dirt),
      },
    ];
    logic.assertEditedVoxels(editsAfterCreate);

    await logic.publish(
      new GameEvent(
        userId,
        new DestroyGroupEvent({ id: groupId, user_id: userId })
      )
    );

    updateInventory(
      logic.world,
      userId,
      { kind: "hotbar", idx: 0 },
      countOf(groupItem(groupId))
    );

    const newBox: Box = {
      v0: [25, 25, 27],
      v1: [27, 26, 28],
    };
    await logic.publish(
      new GameEvent(
        userId,
        new PlaceGroupEvent({
          id: groupId,
          user_id: userId,
          box: newBox,
          inventory_ref: { kind: "hotbar", idx: 0 },
          tensor,
        })
      )
    );

    const editsAfterPlace: EditType[] = [
      {
        pos: [25, 25, 25],
        composedOf: undefined,
      },
      {
        pos: [26, 25, 25],
        composedOf: undefined,
      },
      {
        pos: [25, 25, 27],
        composedOf: anItem(BikkieIds.dirt),
      },
      {
        pos: [26, 25, 27],
        composedOf: anItem(BikkieIds.dirt),
      },
    ];
    logic.assertEditedVoxels(editsAfterPlace);
  });

  it("Glass", () => {
    const tensor = using(new voxeloo.GroupTensorBuilder(), (builder) => {
      builder.setGlass(
        [0, 0, 0],
        toGlassId(getTerrainID("simple_glass")),
        0,
        0,
        0
      );
      return builder.build();
    });
    let i = 0;
    for (const { tensorPos, tensorEntry } of scanGroupTensor(tensor)) {
      ok(tensorPos.every((x: number) => x === 0));
      ok(isGlassGroupEntry(tensorEntry));
      ok(tensorEntry.glass.glass_id === 1);
      ++i;
    }
    ok(i === 1);
    let j = 0;
    tensor.scan((pos, val) => {
      ++j;
      ok(pos.every((x: number) => x === 0));
      ok(isGlassGroupEntry(val));
      ok(val.glass.glass_id === 1);
    });
    ok(j === 1);
  });

  it("can restore to deleted", async () => {
    const { userId, groupId, tensor, box } = await setupGroupTest(
      voxeloo,
      logic
    );

    await logic.publish(
      new GameEvent(
        userId,
        new DestroyGroupEvent({ id: groupId, user_id: userId })
      )
    );
    await logic.publish(
      new GameEvent(
        userId,
        new PlaceGroupEvent({
          id: groupId,
          user_id: userId,
          box,
          inventory_ref: { kind: "hotbar", idx: 0 },
          tensor,
        })
      )
    );

    const group = logic.world.table.get(groupId);
    assert.ok(group);
    assert.ok(!group.restores_to);

    // Add a restoration field.
    createRestorationField(logic.world, [0, -32, 0], [64, 64, 64], 0);

    await logic.publish(
      new GameEvent(
        userId,
        new DestroyGroupEvent({ id: groupId, user_id: userId })
      )
    );
    await logic.publish(
      new GameEvent(
        userId,
        new PlaceGroupEvent({
          id: groupId,
          user_id: userId,
          box,
          inventory_ref: { kind: "hotbar", idx: 0 },
          tensor,
        })
      )
    );

    const toRestoreGroup = logic.world.table.get(groupId);
    assert.ok(toRestoreGroup);
    assert.ok(toRestoreGroup.restores_to?.restore_to_state === "deleted");
    assert.ok(!toRestoreGroup.iced);

    await logic.publish(
      new GameEvent(
        userId,
        new RestoreGroupEvent({ id: groupId, restoreRegion: undefined })
      )
    );

    const restoredGroup = logic.world.table.get(groupId);
    assert.ok(!restoredGroup || restoredGroup.iced);

    const editsAfterDelete: EditType[] = [
      {
        pos: [25, 25, 25],
        composedOf: undefined,
      },
      {
        pos: [26, 25, 25],
        composedOf: undefined,
      },
    ];
    logic.assertEditedVoxels(editsAfterDelete);
  });
  it("can restore to created", async () => {
    const { userId, groupId, box } = await setupGroupTest(voxeloo, logic);

    const group = logic.world.table.get(groupId);
    assert.ok(group);
    assert.ok(!group.restores_to);

    // Add a restoration field.
    createRestorationField(logic.world, [0, -32, 0], [64, 64, 64], 0);

    await logic.publish(
      new GameEvent(
        userId,
        new DestroyGroupEvent({ id: groupId, user_id: userId })
      )
    );
    const editsAfterDestroy: EditType[] = [
      {
        pos: [25, 25, 25],
        composedOf: undefined,
      },
      {
        pos: [26, 25, 25],
        composedOf: undefined,
      },
    ];
    logic.assertEditedVoxels(editsAfterDestroy);

    const toRestoreGroup = logic.world.table.get(groupId);
    assert.ok(toRestoreGroup);
    assert.ok(toRestoreGroup.restores_to?.restore_to_state === "created");
    assert.ok(toRestoreGroup.iced);

    await logic.publish(
      new GameEvent(
        userId,
        new RestoreGroupEvent({ id: groupId, restoreRegion: boxToAabb(box) })
      )
    );

    const restoredGroup = logic.world.table.get(groupId);
    assert.ok(restoredGroup);
    assert.ok(!restoredGroup.iced);
    assert.ok(!restoredGroup.restores_to);

    const editsAfterCreate: EditType[] = [
      {
        pos: [25, 25, 25],
        composedOf: anItem(BikkieIds.dirt),
      },
      {
        pos: [26, 25, 25],
        composedOf: anItem(BikkieIds.dirt),
      },
    ];
    logic.assertEditedVoxels(editsAfterCreate);
  });
});
