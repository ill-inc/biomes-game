import { compile, stringify } from "@/cayley/numerics/compile";
import {
  add,
  fill,
  input,
  merge,
  mul,
  ne,
  slice,
} from "@/cayley/numerics/expression";
import { makeTypedArray } from "@/cayley/numerics/values";
import test from "ava";

test("stringify.merge", (t) => {
  const s = (() => {
    const x = merge(fill("U32", [5], 1), fill("U32", [3], 2), [[2, 5]]);
    const y = merge(x, add(slice(x, [[0, 3]]), slice(x, [[1, 4]])), [[0, 3]]);
    return stringify(y);
  })();

  t.deepEqual(
    s,
    [
      "x0 = merge(fill(), fill());",
      "merge(&x0, add(slice(&x0), slice(&x0)))",
    ].join("\n")
  );
});

test("stringify.input", (t) => {
  const s = (() => {
    const x = input("U32", [5], makeTypedArray("U32", 5).fill(2));
    const y = input("U32", [10], makeTypedArray("U32", 10).fill(3));
    const z = mul(add(x, slice(y, [[0, 5]])), slice(y, [[2, 7]]));
    return stringify(z);
  })();

  t.deepEqual(
    s,
    [
      "x0 = input();",
      "x1 = input();",
      "mul(add(&x0, slice(&x1)), slice(&x1))",
    ].join("\n")
  );
});

test("compile.add", (t) => {
  const array = (() => {
    const x = add(fill("U32", [5], 1), fill("U32", [5], 2));
    return compile(x).run("U32");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [3, 3, 3, 3, 3]);
  } finally {
    array.free();
  }
});

test("compile.merge", (t) => {
  const array = (() => {
    const x = merge(fill("U32", [5], 1), fill("U32", [3], 2), [[2, 5]]);
    const y = merge(x, add(slice(x, [[0, 3]]), slice(x, [[1, 4]])), [[0, 3]]);
    return compile(y).run("U32");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [2, 3, 4, 2, 2]);
  } finally {
    array.free();
  }
});

test("compile.ne", (t) => {
  const array = (() => {
    const x = ne(fill("U32", [5], 1), fill("U32", [5], 2));
    return compile(x).run("Bool");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [1, 1, 1, 1, 1]);
  } finally {
    array.free();
  }
});

test("compile.input", (t) => {
  const array = (() => {
    const x = input("U32", [5], makeTypedArray("U32", 5).fill(2));
    const y = input("U32", [10], makeTypedArray("U32", 10).fill(3));
    const z = mul(add(x, slice(y, [[0, 5]])), slice(y, [[2, 7]]));
    return compile(z).run("U32");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [15, 15, 15, 15, 15]);
  } finally {
    array.free();
  }
});

test("compile.assignment", (t) => {
  const array = (() => {
    const x = input("U32", [5], makeTypedArray("U32", 5), "x");
    const y = input("U32", [10], makeTypedArray("U32", 10), "y");
    const z = mul(add(x, slice(y, [[0, 5]])), slice(y, [[2, 7]]));
    return compile(z).run("U32", {
      x: makeTypedArray("U32", 5).fill(2),
      y: makeTypedArray("U32", 10).fill(3),
    });
  })();

  try {
    t.deepEqual(Array.from(array.view()), [15, 15, 15, 15, 15]);
  } finally {
    array.free();
  }
});
