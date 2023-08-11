import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import {
  bagContains,
  bagCount,
  countOf,
  createBag,
  equalItems,
  getItemTypeId,
  isSplittableItem,
  itemPk,
  takeFromBag,
} from "@/shared/game/items";
import assert from "assert";

describe("Item helpers", () => {
  it("equalItems", () => {
    assert.ok(equalItems(undefined, undefined));
    assert.ok(!equalItems(anItem(BikkieIds.dirt), undefined));
    assert.ok(!equalItems(undefined, anItem(BikkieIds.dirt)));
    assert.ok(equalItems(anItem(BikkieIds.dirt), anItem(BikkieIds.dirt)));
    assert.ok(!equalItems(anItem(BikkieIds.dirt), anItem(BikkieIds.stone)));
  });

  it("itemPk for empty payload", () => {
    assert.equal(itemPk(anItem(BikkieIds.dirt)), "4537020877770180");
    assert.equal(
      itemPk({ id: BikkieIds.dirt, payload: undefined }),
      "4537020877770180"
    );
    assert.equal(
      itemPk({ id: BikkieIds.dirt, payload: {} }),
      "4537020877770180"
    );
    assert.equal(
      itemPk({ id: BikkieIds.dirt, payload: { [52]: true } }),
      '4537020877770180:{"52":true}'
    );
  });

  it("isSplittableItem", () => {
    assert.ok(!isSplittableItem(undefined));
    assert.ok(isSplittableItem(countOf(BikkieIds.bling, 10n)));
    assert.ok(isSplittableItem(countOf(BikkieIds.granite, 10n)));
    assert.ok(!isSplittableItem(countOf(BikkieIds.granite)));
  });

  it("bagCount", () => {
    assert.equal(bagCount(createBag(), undefined), 0n);
    assert.equal(bagCount(createBag(), anItem(BikkieIds.dirt)), 0n);
    assert.equal(
      bagCount(
        createBag(countOf(BikkieIds.stone, 99n)),
        anItem(BikkieIds.dirt)
      ),
      0n
    );
    assert.equal(
      bagCount(
        createBag(countOf(BikkieIds.stone, 99n), countOf(BikkieIds.dirt, 9n)),
        anItem(BikkieIds.dirt)
      ),
      9n
    );
  });

  it("bagContains", () => {
    assert.ok(bagContains(createBag(), undefined));
    assert.ok(
      bagContains(
        createBag(countOf(BikkieIds.stone, 10n), countOf(BikkieIds.dirt, 50n)),
        countOf(BikkieIds.dirt)
      )
    );
    assert.ok(
      bagContains(
        createBag(countOf(BikkieIds.stone, 10n), countOf(BikkieIds.dirt, 50n)),
        anItem(BikkieIds.dirt)
      )
    );
    assert.ok(
      !bagContains(
        createBag(countOf(BikkieIds.stone, 10n), countOf(BikkieIds.dirt, 50n)),
        anItem(BikkieIds.granite)
      )
    );
    assert.ok(
      bagContains(
        createBag(countOf(BikkieIds.stone, 10n), countOf(BikkieIds.dirt, 50n)),
        createBag(countOf(BikkieIds.stone, 5n), countOf(BikkieIds.dirt, 20n))
      )
    );
    assert.ok(
      !bagContains(
        createBag(countOf(BikkieIds.stone, 10n), countOf(BikkieIds.dirt, 50n)),
        createBag(countOf(BikkieIds.stone, 50n), countOf(BikkieIds.dirt, 20n))
      )
    );
  });

  it("getItemTypeId", () => {
    assert.equal(
      getItemTypeId(anItem(BikkieIds.cobblestone)),
      BikkieIds.anyStone
    );
    assert.equal(getItemTypeId(anItem(BikkieIds.stone)), BikkieIds.anyStone);
    assert.equal(getItemTypeId(anItem(BikkieIds.oakLog)), BikkieIds.log);
  });

  it("takefromBag", () => {
    const bag = createBag(
      countOf(BikkieIds.stone, 5n),
      countOf(BikkieIds.dirt, 10n)
    );
    assert.ok(
      !takeFromBag(
        bag,
        createBag(countOf(BikkieIds.stone, 2n), countOf(BikkieIds.dirt, 100n))
      )
    );
    assert.ok(
      bagContains(
        bag,
        createBag(countOf(BikkieIds.stone, 5n), countOf(BikkieIds.dirt, 10n))
      )
    );
    assert.ok(takeFromBag(bag, countOf(BikkieIds.stone, 2n)));
    assert.ok(
      bagContains(
        bag,
        createBag(countOf(BikkieIds.stone, 3n), countOf(BikkieIds.dirt, 10n))
      )
    );
  });
});
