import wasmLoader from "@/gen/shared/cpp_ext/voxeloo-simd/wasm";
import { using } from "@/shared/deletable";
import { makeWasmMemory } from "@/shared/wasm/memory";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";
import { readFile } from "fs/promises";
import { isEqual } from "lodash";
import path from "path";

export async function loadAsanVoxeloo() {
  const wasmFile = path.resolve(
    __dirname,
    "../../../gen/shared/cpp_ext/voxeloo-simd/wasm.wasm"
  );

  return wasmLoader({
    wasmBinary: await readFile(wasmFile),
    wasmMemory: makeWasmMemory(1024),
  });
}

describe("Tests voxeloo", () => {
  let voxeloo!: VoxelooModule;
  before(async function () {
    voxeloo = (await loadAsanVoxeloo()) as VoxelooModule;
    voxeloo.registerErrorLogger((error: string) => {
      throw new Error(`C++ error: ${error}`);
    });
  });

  afterEach(function () {
    if (voxeloo.do_leak_check() != 0) {
      assert.fail("Memory leaks detected.");
    }
  });

  it("Tensor reading and writing", () => {
    using(Tensor.make(voxeloo, [32, 32, 32], "F64"), (tensor) => {
      const update = new TensorUpdate(tensor);
      update.set([0, 0, 0], 3);
      update.set([1, 2, 3], 4);
      update.set([31, 31, 31], 5);
      update.set([31, 6, 7], 6);
      update.apply();

      for (const [pos, val] of tensor) {
        if (isEqual(pos, [0, 0, 0])) {
          assert.strictEqual(val, 3);
        } else if (isEqual(pos, [1, 2, 3])) {
          assert.strictEqual(val, 4);
        } else if (isEqual(pos, [31, 31, 31])) {
          assert.strictEqual(val, 5);
        } else if (isEqual(pos, [31, 6, 7])) {
          assert.strictEqual(val, 6);
        } else {
          assert.strictEqual(val, 0);
        }
      }
    });
  });

  it("Large tensor reading and writing", () => {
    using(Tensor.make(voxeloo, [64, 32, 32], "F64"), (tensor) => {
      const update = new TensorUpdate(tensor);
      update.set([0, 0, 0], 3);
      update.set([1, 2, 3], 4);
      update.set([32, 0, 0], 5);
      update.set([32, 2, 3], 6);
      update.set([63, 31, 31], 7);
      update.apply();
      assert.strictEqual(tensor.get(0, 0, 0), 3);
      assert.strictEqual(tensor.get(1, 2, 3), 4);
      assert.strictEqual(tensor.get(32, 0, 0), 5);
      assert.strictEqual(tensor.get(32, 2, 3), 6);
      assert.strictEqual(tensor.get(63, 31, 31), 7);
    });
  });

  it("Tensor writing out of bounds", () => {
    using(Tensor.make(voxeloo, [32, 32, 32], "F64"), (tensor) => {
      try {
        const update = new TensorUpdate(tensor);
        update.set([0, 0, 0], 3);
        update.set([1, 2, 3], 4);
        update.set([31, 31, 31], 5);
        update.set([32, 6, 7], 6);
        assert.fail("Should have thrown!");
      } catch (error: any) {}
    });
  });
});
