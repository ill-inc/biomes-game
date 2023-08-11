import { DisjointSet } from "@/shared/data_structures/disjoint_set";
import assert from "assert";

describe("Disjoint Set", () => {
  it("works as expected", () => {
    const set = new DisjointSet<number>();

    set.add(0);
    set.add(1);

    assert.notEqual(set.find(0), set.find(1));
    assert.deepEqual(set.extract(), [[0], [1]]);

    set.union(1, 3);
    assert.deepEqual(set.extract(), [[0], [1, 3]]);

    set.union(2, 5);
    assert.deepEqual(set.extract(), [[0], [1, 3], [2, 5]]);

    set.union(3, 5);
    assert.deepEqual(set.extract(), [[0], [1, 3, 2, 5]]);
  });

  it("handles merging children correctly", () => {
    const set = new DisjointSet<number>();

    set.union(0, 1);
    set.union(2, 3);
    set.union(0, 2);

    assert.deepEqual(set.extract(), [[0, 1, 2, 3]]);
  });
});
