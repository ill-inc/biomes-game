import { runSuite } from "@/cayley/bench/common";
import { fillArray } from "@/cayley/numerics/arrays";
import { compile } from "@/cayley/numerics/compile";
import { add, fill } from "@/cayley/numerics/expression";
import { Program } from "@/cayley/numerics/program";

runSuite("Fill", {
  "programs.fill": () => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([32_000]);
    program.value("U32", 1);
    program.run("U32").free();
  },

  "compile.fill": () => {
    compile(fill("U32", [32_000], 1))
      .run("U32")
      .free();
  },

  "arrays.fill": () => {
    fillArray("U32", [32, 32, 32], 1);
  },
});

runSuite("Add", {
  "programs.add": () => {
    const program = new Program();
    program.op("fill", "U32", 1);
    program.shape([32_000]);
    program.value("U32", 2);
    program.op("fill", "U32", 1);
    program.shape([32_000]);
    program.value("U32", 3);
    program.op("mul", "U32", 1);
    program.run("U32").free();
  },

  "compile.add": () => {
    compile(add(fill("U32", [32_000], 2), fill("U32", [32_000], 3)))
      .run("U32")
      .free();
  },

  "arrays.add": () => {
    const a = fillArray("U32", [32, 32, 32], 1);
    const b = fillArray("U32", [32, 32, 32], 1);
    a.view().add(b).eval();
  },
});

runSuite("Arrays Batch Update", {
  // prettier-ignore
  "coordinates.eager": () => {
    const voxels = fillArray("U32", [32, 32, 32], 0);
    voxels.assign([[0, 32], [0, 1], [0, 32]], 1);
    voxels.assign([[14, 18], [1, 32], [14, 18]], 2);
    voxels.addAssign([[0, 32], [0, 32], [0, 32]], voxels);
  },

  "range_expr.eager": () => {
    const voxels = fillArray("U32", [32, 32, 32], 0);
    voxels.assign(":32,:1,:32", 1);
    voxels.assign("14:18,1:32,14:18", 2);
    voxels.addAssign("..", voxels);
  },

  "range_expr.lazy": () => {
    const voxels = fillArray("U32", [32, 32, 32], 0);
    const tmp = voxels
      .view()
      .merge(":32,:1,:32", 1)
      .merge("14:18,1:32,14:18", 2);
    voxels.assign("..", tmp.add(tmp));
  },
});

runSuite("Arrays Tiny Data", {
  // prettier-ignore
  "coordinates.eager": () => {
    const voxels = fillArray("U32", [2, 2, 2], 0);
    voxels.assign([[0, 1], [0, 1], [0, 1]], 1);
    voxels.assign([[1, 2], [1, 2], [1, 2]], 2);
    voxels.addAssign([[0, 2], [0, 2], [0, 2]], voxels);
  },

  "range_expr.eager": () => {
    const voxels = fillArray("U32", [2, 2, 2], 0);
    voxels.assign(":1,:1,:1", 1);
    voxels.assign("1:,1:,1:", 2);
    voxels.addAssign("..", voxels);
  },

  "range_expr.lazy": () => {
    const voxels = fillArray("U32", [2, 2, 2], 0);
    const tmp = voxels.view().merge(":1,:1,:1", 1).merge("1:,1:,1:", 2);
    voxels.assign("..", tmp.add(tmp));
  },
});

runSuite("JS benchmarks", {
  "js.create": () => {
    new Uint32Array(64 * 64 * 64);
  },

  "js.create_and_fill": () => {
    const a = new Uint32Array(64 * 64 * 64);
    a.fill(0);
  },

  "js.create_and_fill_manually": () => {
    const a = new Uint32Array(64 * 64 * 64);
    for (let i = 0; i < 64 * 64 * 64; i += 1) {
      a[i] = 0;
    }
  },

  "js.create_two": () => {
    new Uint32Array(64 * 64 * 64);
    new Uint32Array(64 * 64 * 64);
  },

  "js.create_two_and_set": () => {
    const a = new Uint32Array(64 * 64 * 64);
    const b = new Uint32Array(64 * 64 * 64);
    a.set(b);
  },

  "js.create_and_copy": () => {
    new Uint32Array(64 * 64 * 64).slice();
  },
});
