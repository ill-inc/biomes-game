import { Program } from "@/cayley/numerics/program";
import test from "ava";

test("fill", (t) => {
  const array = (() => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 1);
    return program.run("U32");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [1, 1, 1, 1, 1]);
  } finally {
    array.free();
  }
});

test("mul", (t) => {
  const array = (() => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 2);
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 3);
    program.op("mul", "U32", 1);
    return program.run("U32");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [6, 6, 6, 6, 6]);
  } finally {
    array.free();
  }
});

test("div", (t) => {
  const array = (() => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 8);
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 2);
    program.op("div", "U32", 1);
    return program.run("U32");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [4, 4, 4, 4, 4]);
  } finally {
    array.free();
  }
});

test("merge", (t) => {
  const array = (() => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 2);
    program.op("ref", "U32", 1);
    program.ref(0);
    program.op("slice", "U32", 1);
    program.range([[1, 4]]);
    program.op("ref", "U32", 1);
    program.ref(0);
    program.op("slice", "U32", 1);
    program.range([[2, 5]]);
    program.op("mul", "U32", 1);
    program.op("merge", "U32", 1);
    program.range([[0, 3]]);
    return program.run("U32");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [4, 4, 4, 2, 2]);
  } finally {
    array.free();
  }
});

test("ne", (t) => {
  const array = (() => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 1);
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 2);
    program.op("ne", "U32", 1);
    return program.run("Bool");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [1, 1, 1, 1, 1]);
  } finally {
    array.free();
  }
});

test("eq", (t) => {
  const array = (() => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 1);
    program.op("fill", "U32", 1);
    program.shape([5]);
    program.value("U32", 2);
    program.op("eq", "U32", 1);
    return program.run("Bool");
  })();

  try {
    t.deepEqual(Array.from(array.view()), [0, 0, 0, 0, 0]);
  } finally {
    array.free();
  }
});
