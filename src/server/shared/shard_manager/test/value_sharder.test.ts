import { ValueSharder } from "@/server/shared/shard_manager/value_sharder";
import assert from "assert";

describe("ValueSharder tests", () => {
  it("passes all tests", async () => {
    const sharder = new ValueSharder((update: [string, "add" | "remove"]) => [
      update[0],
      update[1] === "add" ? update[0].length : undefined,
    ]);

    sharder.update([
      ["a", "add"],
      ["b", "add"],
      ["aa", "add"],
    ]);
    assert.equal(sharder.heldValues.size, 0);

    sharder.addHeldShards([1]);
    assert.equal(sharder.heldValues.size, 2);
    assert(sharder.heldValues.has("a"));
    assert(sharder.heldValues.has("b"));

    sharder.addHeldShards([2]);
    assert.equal(sharder.heldValues.size, 3);
    assert(sharder.heldValues.has("a"));
    assert(sharder.heldValues.has("b"));
    assert(sharder.heldValues.has("aa"));

    sharder.removeHeldShards([1]);
    assert.equal(sharder.heldValues.size, 1);
    assert(sharder.heldValues.has("aa"));

    sharder.update([
      ["c", "add"],
      ["bb", "add"],
      ["aaa", "add"],
    ]);
    assert.equal(sharder.heldValues.size, 2);
    assert(sharder.heldValues.has("aa"));
    assert(sharder.heldValues.has("bb"));

    sharder.addHeldShards([1, 3]);
    assert.equal(sharder.heldValues.size, 6);
    assert(sharder.heldValues.has("a"));
    assert(sharder.heldValues.has("b"));
    assert(sharder.heldValues.has("c"));
    assert(sharder.heldValues.has("aa"));
    assert(sharder.heldValues.has("bb"));
    assert(sharder.heldValues.has("aaa"));

    sharder.update([["c", "remove"]]);
    assert.equal(sharder.heldValues.size, 5);
    assert(sharder.heldValues.has("a"));
    assert(sharder.heldValues.has("b"));
    assert(sharder.heldValues.has("aa"));
    assert(sharder.heldValues.has("bb"));
    assert(sharder.heldValues.has("aaa"));

    sharder.removeHeldShards([2, 3]);
    assert.equal(sharder.heldValues.size, 2);
    assert(sharder.heldValues.has("a"));
    assert(sharder.heldValues.has("b"));
  });
});
