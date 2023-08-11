import { ArrayExpr, fillArray, fromValues } from "@/cayley/numerics/arrays";
import { input } from "@/cayley/numerics/expression";
import { concat, stack } from "@/cayley/numerics/manipulate";
import test from "ava";

test("arrays.assignment", (t) => {
  const x = fillArray("U32", [5], 1);
  const y = fillArray("U32", [3], 2);
  x.assign([[0, 3]], y.view());
  x.addAssign([[1, 4]], x.slice([[2, 5]]));

  t.deepEqual(Array.from(x.data), [2, 4, 3, 2, 1]);
});

test("arrays.two_dimensions", (t) => {
  const pixels = fillArray("U32", [4, 4], 0);
  pixels.assign(
    [
      [2, 4],
      [1, 3],
    ],
    new ArrayExpr(input("U32", [2, 2], new Uint32Array([1, 2, 3, 4])))
  );

  t.deepEqual(
    Array.from(pixels.data),
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 3, 4, 0]
  );
});

test("arrays.range_expressions", (t) => {
  const voxels = fillArray("U32", [2, 2, 2], 0);
  voxels.assign(":1,:1,:1", 1);
  voxels.assign("0,1,:", 2);
  voxels.assign("1,0,:", 3);
  voxels.assign("1:,1:,1:", 4);
  voxels.addAssign("..", voxels);

  t.deepEqual(voxels.get([0, 0, 0]), 2);
  t.deepEqual(voxels.get([0, 0, 1]), 0);
  t.deepEqual(voxels.get([0, 1, 0]), 4);
  t.deepEqual(voxels.get([0, 1, 1]), 4);
  t.deepEqual(voxels.get([1, 0, 0]), 6);
  t.deepEqual(voxels.get([1, 0, 1]), 6);
  t.deepEqual(voxels.get([1, 1, 0]), 0);
  t.deepEqual(voxels.get([1, 1, 1]), 8);
});

test("arrays.pad", (t) => {
  const voxels = fillArray("U32", [2, 2], 1);
  voxels.addAssign("..", voxels.slice(":,1:").view().pad([0, 0], [0, 1]));
  voxels.addAssign("..", voxels.slice(":1,:").view().pad([1, 0], [0, 0]));

  t.deepEqual(voxels.get([0, 0]), 2);
  t.deepEqual(voxels.get([0, 1]), 1);
  t.deepEqual(voxels.get([1, 0]), 4);
  t.deepEqual(voxels.get([1, 1]), 2);
});

test("arrays.concat", (t) => {
  const a = fillArray("U32", [2], 1);
  const b = fillArray("U32", [2], 2);
  const c = fillArray("U32", [2], 3);
  const d = concat([a, b, c]);

  t.deepEqual(d.shape, [6]);
  t.deepEqual(d.get([0]), 1);
  t.deepEqual(d.get([1]), 1);
  t.deepEqual(d.get([2]), 2);
  t.deepEqual(d.get([3]), 2);
  t.deepEqual(d.get([4]), 3);
  t.deepEqual(d.get([5]), 3);
});

test("arrays.stack", (t) => {
  const a = fillArray("U32", [2], 1);
  const b = fillArray("U32", [2], 2);
  const c = fillArray("U32", [2], 3);
  const d = stack([a, b, c]);

  t.deepEqual(d.shape, [3, 2]);
  t.deepEqual(d.get([0, 0]), 1);
  t.deepEqual(d.get([0, 1]), 1);
  t.deepEqual(d.get([1, 0]), 2);
  t.deepEqual(d.get([1, 1]), 2);
  t.deepEqual(d.get([2, 0]), 3);
  t.deepEqual(d.get([2, 1]), 3);
});

test("arrays.stack_more", (t) => {
  const a = fillArray("U32", [2, 2, 3], 1);
  const b = fillArray("U32", [2, 2, 3], 2);
  const c = fillArray("U32", [2, 2, 3], 3);
  const d = stack([a, b, c]);

  t.deepEqual(d.shape, [3, 2, 2, 3]);
  t.deepEqual(d.get([0, 0, 0, 0]), 1);
  t.deepEqual(d.get([1, 0, 0, 0]), 2);
  t.deepEqual(d.get([2, 0, 0, 0]), 3);
});

test("arrays.expand", (t) => {
  const voxels = fromValues("U32", [3], [1, 2, 3])
    .view()
    .reshape([1, 3])
    .expand([2, 3])
    .eval();

  t.deepEqual(voxels.get([0, 0]), 1);
  t.deepEqual(voxels.get([0, 1]), 2);
  t.deepEqual(voxels.get([0, 2]), 3);
  t.deepEqual(voxels.get([1, 0]), 1);
  t.deepEqual(voxels.get([1, 1]), 2);
  t.deepEqual(voxels.get([1, 2]), 3);
});

test("arrays.reshape", (t) => {
  const voxels = fromValues("U32", [4], [1, 2, 3, 4])
    .view()
    .reshape([2, 2])
    .eval();

  t.deepEqual(voxels.get([0, 0]), 1);
  t.deepEqual(voxels.get([0, 1]), 2);
  t.deepEqual(voxels.get([1, 0]), 3);
  t.deepEqual(voxels.get([1, 1]), 4);
});

test("arrays.cast", (t) => {
  const voxels = fromValues("F32", [4], [300.0, 255.5, 254.5, -1.0])
    .view()
    .cast("U8")
    .eval();

  t.deepEqual(voxels.get([0]), 255);
  t.deepEqual(voxels.get([1]), 255);
  t.deepEqual(voxels.get([2]), 254);
  t.deepEqual(voxels.get([3]), 0);
});

test("arrays.flip", (t) => {
  const voxels = fromValues("U32", [3], [1, 2, 3])
    .view()
    .reshape([1, 3])
    .expand([2, 3])
    .flip([false, true])
    .eval();

  t.deepEqual(voxels.get([0, 0]), 3);
  t.deepEqual(voxels.get([0, 1]), 2);
  t.deepEqual(voxels.get([0, 2]), 1);
  t.deepEqual(voxels.get([1, 0]), 3);
  t.deepEqual(voxels.get([1, 1]), 2);
  t.deepEqual(voxels.get([1, 2]), 1);
});

test("arrays.step", (t) => {
  const voxels = fromValues("U32", [4], [1, 2, 3, 4])
    .view()
    .reshape([1, 4])
    .expand([4, 4])
    .step([2, 2])
    .eval();

  t.deepEqual(voxels.shape, [2, 2]);
  t.deepEqual(voxels.get([0, 0]), 1);
  t.deepEqual(voxels.get([0, 1]), 3);
  t.deepEqual(voxels.get([1, 0]), 1);
  t.deepEqual(voxels.get([1, 1]), 3);
});

test("arrays.min_and_max", (t) => {
  const a = fromValues("U32", [4], [1, 2, 3, 4]);
  const b = fromValues("U32", [4], [4, 3, 2, 1]);
  const c = a.view().max(b.view()).eval();
  const d = a.view().min(b.view()).eval();

  t.deepEqual(c.get([0]), 4);
  t.deepEqual(c.get([1]), 3);
  t.deepEqual(c.get([2]), 3);
  t.deepEqual(c.get([3]), 4);

  t.deepEqual(d.get([0]), 1);
  t.deepEqual(d.get([1]), 2);
  t.deepEqual(d.get([2]), 2);
  t.deepEqual(d.get([3]), 1);
});
