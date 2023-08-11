import { blockDropTable } from "@/server/logic/utils/drops";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ItemBag } from "@/shared/ecs/gen/types";
import {
  bagEquals,
  countOf,
  createBag,
  rollLootTable,
} from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import assert from "assert";

function assertBagContents(bag: ItemBag, contents: ItemBag) {
  assert.ok(
    bagEquals(bag, contents),
    `${itemBagToString(bag)} != ${itemBagToString(contents)}`
  );
}

describe("Test drops", () => {
  it("handles drops for dirt", () => {
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.dirt,
        toolDestroyerClass: 2,
        seedBlock: false,
      }),
      createBag(countOf(BikkieIds.dirt, 1n))
    );
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.dirt,
        toolDestroyerClass: 1,
        seedBlock: false,
      }),
      createBag(countOf(BikkieIds.dirt, 1n))
    );
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.dirt,
        toolDestroyerClass: 0,
        seedBlock: false,
      }),
      createBag(countOf(BikkieIds.dirt, 1n))
    );
  });

  it("handles drops for user-placed", () => {
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.goldOre,
        toolDestroyerClass: 2,
        seedBlock: false,
      }),
      createBag(countOf(BikkieIds.goldOre, 1n))
    );
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.goldOre,
        toolDestroyerClass: 2,
        seedBlock: true,
      }),
      createBag(countOf(BikkieIds.goldNugget, 1n))
    );
  });

  it("hands give cobblestone for stone", () => {
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.stone,
        toolDestroyerClass: 2,
        seedBlock: true,
      }),
      createBag(countOf(BikkieIds.stone, 1n))
    );
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.stone,
        toolDestroyerClass: 1,
        seedBlock: true,
      }),
      createBag(countOf(BikkieIds.cobblestone, 1n))
    );
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.stone,
        toolDestroyerClass: 0,
        seedBlock: true,
      }),
      createBag(countOf(BikkieIds.cobblestone, 1n))
    );
    assertBagContents(
      rollLootTable(blockDropTable(), {
        block: BikkieIds.stone,
        toolDestroyerClass: 0,
        seedBlock: false,
      }),
      createBag(countOf(BikkieIds.stone, 1n))
    );
  });
});
