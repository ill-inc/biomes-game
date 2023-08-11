import { BikkieIds } from "@/shared/bikkie/ids";
import { Inventory } from "@/shared/ecs/gen/components";
import type { OwnedItems } from "@/shared/game/inventory";
import {
  createInventorySafeBag,
  determineGivePattern,
  determineTakePattern,
  getMaxCombinable,
  inventoryCount,
  isValidInventoryItemCount,
  maxInventoryStack,
} from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import { bagContains, countOf, createBag } from "@/shared/game/items";
import { permutations } from "@/shared/util/collections";
import assert from "assert";

describe("Inventory helpers", () => {
  it("can count contents", () => {
    const inventory = Inventory.create();

    assert.equal(inventoryCount(inventory, anItem(BikkieIds.clownfish)), 0n);

    inventory.hotbar[2] = countOf(BikkieIds.clownfish, 10n);

    assert.equal(inventoryCount(inventory, anItem(BikkieIds.clownfish)), 10n);
  });

  it("maxInventoryStack", () => {
    assert.equal(maxInventoryStack(anItem(BikkieIds.dirt)), 99n);
    assert.equal(maxInventoryStack(anItem(BikkieIds.arrowThroughHead)), 1n);
    assert.equal(maxInventoryStack(anItem(BikkieIds.recipeStick)), 0n);
  });

  it("validInventoryItemCount", () => {
    const dirt = anItem(BikkieIds.dirt);
    assert.ok(!isValidInventoryItemCount(dirt, -9n));
    assert.ok(!isValidInventoryItemCount(dirt, 0n));
    assert.ok(!isValidInventoryItemCount(dirt, 1000n));
    assert.ok(!isValidInventoryItemCount(dirt, 1000n));
    assert.ok(isValidInventoryItemCount(dirt, 99n));
  });

  it("createInventorySafeBag", () => {
    assert.notEqual(
      createInventorySafeBag(countOf(BikkieIds.dirt, 10n)),
      undefined
    );
    assert.notEqual(
      createInventorySafeBag(countOf(BikkieIds.dirt, 1000n)),
      undefined
    );
  });

  it("getMaxCombinable", () => {
    assert.equal(
      getMaxCombinable({
        from: undefined,
      }),
      0n
    );
    assert.equal(
      getMaxCombinable({
        from: countOf(BikkieIds.dirt),
        to: countOf(BikkieIds.stone),
      }),
      0n
    );
    assert.equal(
      getMaxCombinable({
        from: countOf(BikkieIds.dirt),
        to: countOf(BikkieIds.dirt),
        count: 10n,
      }),
      0n
    );
    assert.equal(
      getMaxCombinable({
        from: countOf(BikkieIds.dirt, 10n),
        to: countOf(BikkieIds.dirt),
      }),
      10n
    );
    assert.equal(
      getMaxCombinable({
        from: countOf(BikkieIds.dirt, 10n),
        to: countOf(BikkieIds.dirt, 90n),
      }),
      9n
    );
    assert.equal(
      getMaxCombinable({
        from: countOf(BikkieIds.arrowThroughHead, 1n),
        to: countOf(BikkieIds.arrowThroughHead, 10n),
      }),
      0n
    );
  });
});

describe("Give patterns", () => {
  let player: OwnedItems;
  beforeEach(() => {
    player = {
      inventory: Inventory.create({ items: new Array(3) }),
    };
  });

  it("Should place dirt in the first empty slot", () => {
    assert.deepEqual(
      determineGivePattern(player, createBag(countOf(BikkieIds.dirt, 10n))),
      [
        [
          {
            idx: 0,
            kind: "item",
          },
          {
            count: 10n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
      ]
    );
  });

  it("Should place grass in the first slot, dirt in the second", () => {
    assert.deepEqual(
      determineGivePattern(
        player,
        createBag(countOf(BikkieIds.grass, 5n), countOf(BikkieIds.dirt, 10n))
      ),
      [
        [
          {
            idx: 0,
            kind: "item",
          },
          {
            count: 5n,
            item: {
              id: BikkieIds.grass,
              payload: undefined,
            },
          },
        ],
        [
          {
            idx: 1,
            kind: "item",
          },
          {
            count: 10n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
      ]
    );
  });

  it("Should spread the large number across three slots", () => {
    assert.deepEqual(
      determineGivePattern(player, createBag(countOf(BikkieIds.dirt, 200n))),
      [
        [
          {
            idx: 0,
            kind: "item",
          },
          {
            count: 99n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
        [
          {
            idx: 1,
            kind: "item",
          },
          {
            count: 99n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
        [
          {
            idx: 2,
            kind: "item",
          },
          {
            count: 2n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
      ]
    );
  });

  it("Cannot fit this much dirt in the inventory", () => {
    assert.deepEqual(
      determineGivePattern(player, createBag(countOf(BikkieIds.dirt, 300n))),
      undefined,
      "Cannot fit this much dirt in the inventory"
    );
  });

  it("Should combine dirt with what already exists", () => {
    player.inventory!.items[1] = countOf(BikkieIds.dirt, 5n);
    assert.deepEqual(
      determineGivePattern(player, createBag(countOf(BikkieIds.dirt, 10n))),
      [
        [
          {
            idx: 1,
            kind: "item",
          },
          {
            count: 10n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
      ]
    );
  });

  it("Should spread dirt across existing slots", () => {
    player.inventory!.items[0] = countOf(BikkieIds.dirt, 5n);
    assert.deepEqual(
      determineGivePattern(player, createBag(countOf(BikkieIds.dirt, 200n))),
      [
        [
          {
            idx: 0,
            kind: "item",
          },
          {
            count: 94n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
        [
          {
            idx: 1,
            kind: "item",
          },
          {
            count: 99n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
        [
          {
            idx: 2,
            kind: "item",
          },
          {
            count: 7n,
            item: {
              id: BikkieIds.dirt,
              payload: undefined,
            },
          },
        ],
      ]
    );
  });
});

describe("Take Patterns", () => {
  it("Should properly take items with a type match hierarchy, regardless of permutation", () => {
    const items = [
      countOf(BikkieIds.cobblestone, 5n),
      countOf(BikkieIds.stone, 20n),
      countOf(BikkieIds.oakLog, 2n),
    ];
    const takeBag = createBag(
      countOf(BikkieIds.anyStone, 10n),
      countOf(BikkieIds.cobblestone, 5n),
      countOf(BikkieIds.oakLog, 1n)
    );
    for (const permutation of permutations(items)) {
      const player = { inventory: Inventory.create({ items: permutation }) };
      const pattern = determineTakePattern(player, takeBag, {
        allowTypeMatch: true,
      });
      assert.deepEqual(pattern, [
        [
          { kind: "item", idx: permutation.indexOf(items[0]) },
          countOf(BikkieIds.cobblestone, 5n),
        ],
        [
          { kind: "item", idx: permutation.indexOf(items[1]) },
          countOf(BikkieIds.stone, 10n),
        ],
        [
          { kind: "item", idx: permutation.indexOf(items[2]) },
          countOf(BikkieIds.oakLog, 1n),
        ],
      ]);
    }
  });

  it("allowTypeMatch should only match item type id biscuits", () => {
    const cobblestoneInventory = [countOf(BikkieIds.cobblestone, 5n)];
    const stoneInventory = [countOf(BikkieIds.stone, 5n)];
    const takeBagAnyStone = createBag(countOf(BikkieIds.anyStone, 1n));
    const takeBagStone = createBag(countOf(BikkieIds.stone, 1n));
    // Test assumptions
    assert.ok(
      anItem(BikkieIds.cobblestone).isAnyStone,
      "cobblestone is not an any stone"
    );
    assert.ok(anItem(BikkieIds.stone).isAnyStone, "stone is not an any stone");
    assert.ok(
      BikkieIds.cobblestone !== BikkieIds.anyStone,
      "cobblestone is type any stone"
    );
    assert.ok(
      BikkieIds.stone !== BikkieIds.anyStone,
      "stone is type any stone"
    );

    const cobblestonePlayer = {
      inventory: Inventory.create({ items: cobblestoneInventory }),
    };
    const stonePlayer = {
      inventory: Inventory.create({ items: stoneInventory }),
    };
    const takeOptions = {
      allowTypeMatch: true,
    };
    assert.deepEqual(
      determineTakePattern(cobblestonePlayer, takeBagAnyStone, takeOptions),
      [[{ kind: "item", idx: 0 }, countOf(BikkieIds.cobblestone, 1n)]],
      "Should match cobblestone with any stone"
    );
    assert.deepEqual(
      determineTakePattern(stonePlayer, takeBagAnyStone, takeOptions),
      [[{ kind: "item", idx: 0 }, countOf(BikkieIds.stone, 1n)]],
      "Should match stone with any stone"
    );
    assert.deepEqual(
      determineTakePattern(cobblestonePlayer, takeBagStone, takeOptions),
      undefined,
      "Should not match cobblestone with stone"
    );
    assert.deepEqual(
      determineTakePattern(stonePlayer, takeBagStone, takeOptions),
      [[{ kind: "item", idx: 0 }, countOf(BikkieIds.stone, 1n)]],
      "Should match stone with stone"
    );

    // BagContains bag
    assert.ok(
      bagContains(
        takeBagStone,
        createBag(countOf(BikkieIds.stone, 1n)),
        takeOptions
      ),
      "Stone bag should contain bag of stone"
    );
    assert.ok(
      bagContains(
        takeBagAnyStone,
        createBag(countOf(BikkieIds.stone, 1n)),
        takeOptions
      ),
      "Any stone bag should contain bag of stone"
    );
    assert.ok(
      !bagContains(
        takeBagStone,
        createBag(countOf(BikkieIds.cobblestone, 1n)),
        takeOptions
      ),
      "Stone bag should not contain bag of cobblestone"
    );
    assert.ok(
      bagContains(
        takeBagAnyStone,
        createBag(countOf(BikkieIds.cobblestone, 1n)),
        takeOptions
      ),
      "Any stone bag should contain bag of cobblestone"
    );

    // BagContains item
    assert.ok(
      bagContains(takeBagStone, countOf(BikkieIds.stone, 1n), takeOptions),
      "Stone bag should contain stone"
    );
    assert.ok(
      bagContains(takeBagAnyStone, countOf(BikkieIds.stone, 1n), takeOptions),
      "Any stone bag should contain stone"
    );
    assert.ok(
      !bagContains(
        takeBagStone,
        countOf(BikkieIds.cobblestone, 1n),
        takeOptions
      ),
      "Stone bag should not contain cobblestone"
    );
    assert.ok(
      bagContains(
        takeBagAnyStone,
        countOf(BikkieIds.cobblestone, 1n),
        takeOptions
      ),
      "Any stone bag should contain cobblestone"
    );
  });
});
