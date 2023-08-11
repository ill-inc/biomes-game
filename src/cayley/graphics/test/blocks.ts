import { toBlockGeometry } from "@/cayley/graphics/blocks";
import { makeArray } from "@/cayley/numerics/arrays";
import test from "ava";

test("toBlockGeometry.1x1x1", (t) => {
  const voxels = makeArray("U32", [1, 1, 1]);
  voxels.set([0, 0, 0], 1);

  const geometry = toBlockGeometry(voxels);

  t.deepEqual(geometry.vertices.data.length, 9 * 4 * 6);
  t.deepEqual(geometry.indices.length, 3 * 2 * 6);
});

test("toBlockGeometry.3x3x3", (t) => {
  const voxels = makeArray("U32", [3, 3, 3]);
  voxels.set([1, 1, 1], 1);

  const geometry = toBlockGeometry(voxels);

  t.deepEqual(geometry.vertices.data.length, 9 * 4 * 6);
  t.deepEqual(geometry.indices.length, 3 * 2 * 6);
});
