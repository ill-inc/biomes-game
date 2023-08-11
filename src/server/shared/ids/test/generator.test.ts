import {
  DbIdGenerator,
  ilcg,
  lcg,
  MAX_ID,
} from "@/server/shared/ids/generator";
import { createBdb } from "@/server/shared/storage";
import { createInMemoryStorage } from "@/server/shared/storage/memory";
import assert from "assert";

describe("Test ID generation", () => {
  it("lcg bounds checks", () => {
    assert.equal(lcg(0), 1);
    assert.equal(lcg(1), 3002399751580331);
    assert.equal(lcg(9007199254740986), 6004799503160658);
    assert.equal(lcg(Number(MAX_ID)), 1);
  });

  it("lets us invert the LCG mapping", () => {
    assert.equal(ilcg(lcg(42)), 42);
    assert.equal(ilcg(0), 3002399751580328);
    assert.equal(lcg(3002399751580328), 0);
  });

  it("handles ID-space exhausted", async () => {
    const store = createInMemoryStorage();
    const db = createBdb(store);
    const generator = new DbIdGenerator(db, []);
    try {
      await generator.next();
      assert.fail("Expected error");
    } catch (e) {
      // Expected.
    }
  });

  it("can generate an ID", async () => {
    const store = createInMemoryStorage();
    const db = createBdb(store);
    const generator = new DbIdGenerator(db, [42]);
    assert.equal(await generator.next(), 86826341220823);
  });
});
