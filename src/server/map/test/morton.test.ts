import { mortonSort } from "@/server/map/utils";
import type { Vec2 } from "@/shared/math/types";
import assert from "assert";

describe("Test sorting point in z-order", () => {
  it("Make sure the sorted order is correct", async () => {
    const points: Vec2[] = [];
    for (let y = -2; y < 2; y += 1) {
      for (let x = -2; x < 2; x += 1) {
        points.push([x, y]);
      }
    }
    mortonSort(points);

    assert.deepEqual(points[0], [0, 0]);
    assert.deepEqual(points[1], [1, 0]);
    assert.deepEqual(points[2], [0, 1]);
    assert.deepEqual(points[3], [1, 1]);

    assert.deepEqual(points[4], [-2, 0]);
    assert.deepEqual(points[5], [-1, 0]);
    assert.deepEqual(points[6], [-2, 1]);
    assert.deepEqual(points[7], [-1, 1]);

    assert.deepEqual(points[8], [0, -2]);
    assert.deepEqual(points[9], [1, -2]);
    assert.deepEqual(points[10], [0, -1]);
    assert.deepEqual(points[11], [1, -1]);

    assert.deepEqual(points[12], [-2, -2]);
    assert.deepEqual(points[13], [-1, -2]);
    assert.deepEqual(points[14], [-2, -1]);
    assert.deepEqual(points[15], [-1, -1]);
  });
});
