import { GameEvent } from "@/server/shared/api/game_event";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import {
  addGameUser,
  cleanInventory,
  createSolidTerrainShard,
  getAllInventory,
  getEntitiesWithComponent,
  TestLogicApi,
} from "@/server/test/test_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import { EditEvent, PickUpEvent } from "@/shared/ecs/gen/events";
import { anItem } from "@/shared/game/item";
import { addToBag, bagContains, countOf, createBag } from "@/shared/game/items";
import { generateTestId } from "@/shared/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

const TEST_ID = generateTestId();

describe("Drops", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let logic: TestLogicApi;
  beforeEach(() => {
    logic = new TestLogicApi(voxeloo);
  });

  it("can be created and acquired", async () => {
    const id = (
      await addGameUser(logic.world, TEST_ID, {
        position: [0, 0, 0],
      })
    ).id;
    const shard = createSolidTerrainShard(
      voxeloo,
      logic.world,
      [0, 0, 0],
      anItem(BikkieIds.dirt)
    );

    // Take all items from the inventory.
    cleanInventory(logic.world, id);

    // Edit the ground.
    await logic.publish(
      new GameEvent(id, new EditEvent({ id: shard, value: 0, user_id: id }))
    );

    // Assert the needed drops were created.
    const drops = getEntitiesWithComponent(logic.world, "grab_bag");
    assert.ok(drops.length > 0);
    const allDroppedItems = createBag();
    for (const drop of drops) {
      const contents = drop.grab_bag.slots;
      assert.equal(
        contents.size,
        1,
        "Drops should only contain a single item type"
      );
      if (bagContains(contents, countOf(BikkieIds.bling))) {
        continue;
      }
      addToBag(allDroppedItems, contents);
      assert.ok(bagContains(contents, countOf(BikkieIds.dirt, 1n)));
    }

    // Indicate it should be picked up.
    await logic.publish(
      ...drops.map(
        (drop) => new GameEvent(id, new PickUpEvent({ id: id, item: drop.id }))
      )
    );

    const remainingDrops = getEntitiesWithComponent(logic.world, "grab_bag");
    assert.equal(remainingDrops.length, 0);

    const nick = logic.world.table.get(id);
    assert.ok(nick);

    const allInventory = getAllInventory(nick);
    assert.equal(allInventory.size, allDroppedItems.size);
    assert.ok(bagContains(allInventory, allDroppedItems));
  });
});
