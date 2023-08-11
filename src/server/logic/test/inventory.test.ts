import { GameEvent } from "@/server/shared/api/game_event";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import {
  addGameUser,
  editEntity,
  setItemAtSlotIndex,
  testInventoryEditor,
  TestLogicApi,
} from "@/server/test/test_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  InventoryCombineEvent,
  InventorySplitEvent,
  InventorySwapEvent,
} from "@/shared/ecs/gen/events";
import { countOf, createBag } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { generateTestId } from "@/shared/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert, { ok } from "assert";

const TEST_ID = generateTestId();

describe("Inventory", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let logic: TestLogicApi;
  let tommyd: ReadonlyEntity;
  beforeEach(async () => {
    voxeloo = await loadVoxeloo();
    logic = new TestLogicApi(voxeloo);
    tommyd = await addGameUser(logic.world, TEST_ID, {})!;
  });

  const inventorySlotSwap = async (
    entityId: BiomesId,
    srcIdx: number,
    dstIdx: number
  ) => {
    return logic.publish(
      new GameEvent(
        entityId,
        new InventorySwapEvent({
          src_id: entityId,
          src: {
            kind: "item",
            idx: srcIdx,
          },
          dst: {
            kind: "item",
            idx: dstIdx,
          },
          player_id: entityId,
        })
      )
    );
  };

  describe("swapping", () => {
    it("should work between empty slots", async () => {
      assert.ok(tommyd.inventory?.items.length ?? 0 > 0);
      assert.ok(tommyd.inventory!.items[0] === undefined);
      assert.ok(tommyd.inventory!.items[1] === undefined);
      await inventorySlotSwap(tommyd.id, 0, 1);
      const newTommy = logic.world.table.get(tommyd.id);
      ok(newTommy);
      assert.ok(newTommy.inventory!.items[0] === undefined);
      assert.ok(newTommy.inventory!.items[1] === undefined);
    });

    it("should work between set slots", async () => {
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 99n),
        0
      );

      let tommy = logic.world.table.get(tommyd.id)!;
      assert.ok(tommy.inventory!.items[0] !== undefined);
      await inventorySlotSwap(tommyd.id, 0, 1);

      tommy = logic.world.table.get(tommyd.id)!;
      assert.ok(tommy.inventory!.items[0] === undefined);
      assert.ok(tommy.inventory!.items[1]?.count === 99n);
      assert.ok(tommy.inventory!.items[1]?.item.id === BikkieIds.dirt);
    });

    it("shouldn't work between crazy slots", async () => {
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 99n),
        0
      );

      let tommy = logic.world.table.get(tommyd.id)!;
      assert.ok(tommy.inventory!.items[0] !== undefined);
      await inventorySlotSwap(tommyd.id, 0, 10000);
      tommy = logic.world.table.get(tommyd.id)!;
      assert.ok(tommy.inventory!.items[0] !== undefined);
    });
  });

  describe("Inventory Overflow", () => {
    it("Should overflow when needed", () => {
      editEntity(logic.world, tommyd.id, (entity) => {
        const editor = testInventoryEditor(entity);
        assert.ok(!entity.inventory()?.overflow.size);
        editor.giveWithInventoryOverflow(
          createBag(countOf(BikkieIds.dirt, undefined, 100000n))
        );

        assert.ok(entity.inventory()?.overflow.size);
      });
    });

    it("Should accept currency always", () => {
      editEntity(logic.world, tommyd.id, (entity) => {
        assert.ok(!entity.inventory()?.overflow.size);
        assert.ok(!entity.inventory()?.currencies.size);
        const editor = testInventoryEditor(entity);
        editor.giveWithInventoryOverflow(
          createBag(
            countOf(BikkieIds.dirt, undefined, 100000n),
            countOf(BikkieIds.bling, undefined, 1000000n)
          )
        );
        assert.ok(entity.inventory()?.overflow.size);
        assert.ok(entity.inventory()?.currencies.size);
      });
    });
  });

  describe("combining", () => {
    it("should stack stuffs", async () => {
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 99n),
        0
      );
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 49n),
        1
      );

      await logic.publish(
        new GameEvent(
          tommyd.id,
          new InventoryCombineEvent({
            src_id: tommyd.id,
            src: {
              kind: "item",
              idx: 0,
            },
            dst: {
              kind: "item",
              idx: 1,
            },
            player_id: tommyd.id,
            count: 50n,
          })
        )
      );

      const newTommy = logic.world.table.get(tommyd.id);
      assert.ok(newTommy?.inventory?.items[0]?.count === 99n - 50n);
      assert.ok(newTommy?.inventory?.items[1]?.count === 99n);
    });

    it("shouldn't overflow a stack", async () => {
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 99n),
        0
      );
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 49n),
        1
      );

      await logic.publish(
        new GameEvent(
          tommyd.id,
          new InventoryCombineEvent({
            src_id: tommyd.id,
            src: {
              kind: "item",
              idx: 0,
            },
            dst: {
              kind: "item",
              idx: 1,
            },
            count: 51n,
          })
        )
      );

      const newTommy = logic.world.table.get(tommyd.id);
      assert.ok(newTommy?.inventory?.items[0]?.count === 99n);
      assert.ok(newTommy?.inventory?.items[1]?.count === 49n);
    });
  });

  describe("splitting", () => {
    it("should work", async () => {
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 99n),
        0
      );
      await logic.publish(
        new GameEvent(
          tommyd.id,
          new InventorySplitEvent({
            src_id: tommyd.id,
            src: {
              kind: "item",
              idx: 0,
            },
            dst: {
              kind: "item",
              idx: 1,
            },
            player_id: tommyd.id,
            count: 49n,
          })
        )
      );

      const newTommy = logic.world.table.get(tommyd.id);
      assert.ok(newTommy?.inventory?.items[0]?.count === 50n);
      assert.ok(newTommy?.inventory?.items[1]?.count === 49n);
    });
    it("shouldn't split too much", async () => {
      setItemAtSlotIndex(
        logic.world,
        tommyd.id,
        countOf(BikkieIds.dirt, undefined, 1n),
        0
      );
      await logic.publish(
        new GameEvent(
          tommyd.id,
          new InventorySplitEvent({
            src_id: tommyd.id,
            src: {
              kind: "item",
              idx: 0,
            },
            dst: {
              kind: "item",
              idx: 1,
            },
            count: 49n,
          })
        )
      );
      const newTommy = logic.world.table.get(tommyd.id);
      assert.ok(newTommy?.inventory?.items[0]?.count === 1n);
      assert.ok(newTommy?.inventory?.items[1] === undefined);
    });
    it("shouldn't split an empty slot", async () => {
      await logic.publish(
        new GameEvent(
          tommyd.id,
          new InventorySplitEvent({
            src_id: tommyd.id,
            src: {
              kind: "item",
              idx: 0,
            },
            dst: {
              kind: "item",
              idx: 1,
            },
            count: 49n,
          })
        )
      );
      const newTommy = logic.world.table.get(tommyd.id);
      assert.ok(newTommy?.inventory?.items[0] === undefined);
      assert.ok(newTommy?.inventory?.items[1] === undefined);
    });
  });
});
