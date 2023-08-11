import wasmLoader from "@/gen/shared/cpp_ext/voxeloo-simd/wasm";
import { using, usingAll } from "@/shared/deletable";
import { shardEncode } from "@/shared/game/shard";
import type { Vec3 } from "@/shared/math/types";
import { makeWasmMemory } from "@/shared/wasm/memory";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseTable } from "@/shared/wasm/types/biomes";
import { Dir } from "@/shared/wasm/types/common";
import type { CppTensor } from "@/shared/wasm/types/tensors";
import assert from "assert";
import { readFile } from "fs/promises";
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

  it("AABB intersection testing should work", () => {
    using(new voxeloo.VolumeBlock_Bool(), (block) => {
      block.set(1, 1, 1, 1);
      block.set(2, 1, 1, 1);
      block.set(3, 1, 1, 1);
      block.set(1, 3, 1, 1);
      block.set(2, 3, 1, 1);
      block.set(3, 3, 1, 1);
      block.set(1, 5, 1, 1);
      block.set(2, 5, 1, 1);
      block.set(3, 5, 1, 1);

      using(voxeloo.to_boxes(block, [0, 0, 0]), (boxes) => {
        let i = 0;
        boxes.intersect(
          [
            [1.5, 1.5, 1.5],
            [2.5, 3.5, 2.5],
          ],
          (hit) => {
            switch (i) {
              case 0:
                assert.deepEqual(hit, [
                  [1, 1, 1],
                  [4, 2, 2],
                ]);
                break;
              case 1:
                assert.deepEqual(hit, [
                  [1, 3, 1],
                  [4, 4, 2],
                ]);
                break;
              default:
                assert.fail();
            }
            i += 1;
          }
        );
      });
    });
  });

  it("VolumeBlock serialization should work", () => {
    const dump = using(new voxeloo.VolumeBlock_U32(), (block) => {
      block.set(1, 0, 1, 1);
      block.set(2, 1, 2, 2);
      block.set(3, 2, 0, 3);
      block.set(1, 3, 4, 4);
      return block.save();
    });

    using(new voxeloo.VolumeBlock_U32(), (block) => {
      block.load(dump);
      assert.strictEqual(block.get(1, 0, 1), 1);
      assert.strictEqual(block.get(2, 1, 2), 2);
      assert.strictEqual(block.get(3, 2, 0), 3);
      assert.strictEqual(block.get(1, 3, 4), 4);
    });
  });

  it("toTerrainTensor should work", () => {
    using(new voxeloo.VolumeBlock_U32(), (block) => {
      block.set(1, 0, 1, 1);
      block.set(2, 1, 2, 2);
      block.set(3, 2, 0, 3);
      block.set(1, 3, 4, 4);

      using(voxeloo.toTerrainTensor(block), (tensor) => {
        assert.strictEqual(tensor.get(1, 0, 1), 1);
        assert.strictEqual(tensor.get(2, 1, 2), 2);
        assert.strictEqual(tensor.get(3, 2, 0), 3);
        assert.strictEqual(tensor.get(1, 3, 4), 4);

        // Test a couple zeroes as well.
        assert.strictEqual(tensor.get(0, 0, 0), 0);
        assert.strictEqual(tensor.get(1, 1, 1), 0);
      });
    });
  });

  it("Index build and serialization should work", () => {
    const dump = using(new voxeloo.IndexBuilder_U64(10, 0n), (block) => {
      block.add(2, 1n);
      block.add(3, 2n);
      block.add(4, 3n);
      block.add(5, 4n);
      const buffer = new voxeloo.DynamicBuffer_U8();
      const index = block.build();
      index.save(buffer);
      return buffer;
    });

    using(new voxeloo.Index_U64(), (block) => {
      block.load(dump);
      assert.strictEqual(block.get(2), 1n);
      assert.strictEqual(block.get(3), 2n);
      assert.strictEqual(block.get(4), 3n);
      assert.strictEqual(block.get(5), 4n);
    });
  });

  it("SparseBlock serialization should work", () => {
    const dump = using(new voxeloo.SparseBlock_U32(), (block) => {
      block.set(1, 0, 1, 1);
      block.set(2, 1, 2, 2);
      block.set(3, 2, 0, 3);
      block.set(1, 3, 4, 4);
      return block.save();
    });

    using(new voxeloo.SparseBlock_U32(), (block) => {
      block.load(dump);
      assert.strictEqual(block.get(1, 0, 1), 1);
      assert.strictEqual(block.get(2, 1, 2), 2);
      assert.strictEqual(block.get(3, 2, 0), 3);
      assert.strictEqual(block.get(1, 3, 4), 4);
    });
  });

  it("VolumeMap serialization should work", () => {
    const dump = using(new voxeloo.VolumeMap_U32(), (block) => {
      block.set(1, 0, -1, 1);
      block.set(-1231232, 1, 2123, 2);
      block.set(3, 12523532, 0, 3);
      block.set(-112312312, -12312323, 4, 4);
      return block.save();
    });

    using(new voxeloo.VolumeMap_U32(), (block) => {
      block.load(dump);
      assert.strictEqual(block.get(1, 0, -1), 1);
      assert.strictEqual(block.get(-1231232, 1, 2123), 2);
      assert.strictEqual(block.get(3, 12523532, 0), 3);
      assert.strictEqual(block.get(-112312312, -12312323, 4), 4);
    });
  });

  it("SparseMap serialization should work", () => {
    const dump = using(new voxeloo.SparseMap_U32(), (block) => {
      block.set(1, 0, -1, 1);
      block.set(-1231232, 1, 2123, 2);
      block.set(3, 12523532, 0, 3);
      block.set(-112312312, -12312323, 4, 4);

      let count = 0;
      block.scan((x, y, z, value) => {
        assert.strictEqual(block.get(x, y, z), value);
        count++;
      });
      assert.strictEqual(count, block.size());

      return block.save();
    });

    using(new voxeloo.SparseMap_U32(), (block) => {
      block.load(dump);
      assert.strictEqual(block.get(1, 0, -1), 1);
      assert.strictEqual(block.get(-1231232, 1, 2123), 2);
      assert.strictEqual(block.get(3, 12523532, 0), 3);
      assert.strictEqual(block.get(-112312312, -12312323, 4), 4);
    });
  });

  it("SparseTable should support basic operations", () => {
    using(new voxeloo.SparseTable(), (table: SparseTable) => {
      table.set(0, 0, 0, "hello");
      table.set(1, 2, 3, "hello");
      table.set(1, 2, 3, "there");
      table.set(3, 6, 5, "hello");
      table.set(19, 12, 3, "hello");
      table.set(19, 12, 3, "there");
      table.del(3, 6, 5);

      assert.strictEqual(table.size(), 3);
      assert.strictEqual(table.get(0, 0, 0), "hello");
      assert.strictEqual(table.get(1, 2, 3), "there");
      assert.strictEqual(table.get(19, 12, 3), "there");

      let count = 0;
      table.scan((x, y, z, value) => {
        assert.strictEqual(table.get(x, y, z), value);
        count++;
      });
      assert.strictEqual(count, table.size());

      const dump = table.save();
      table.clear();
      assert.strictEqual(table.empty(), true);
      assert.strictEqual(table.size(), 0);

      table.load(dump);
      assert.strictEqual(table.size(), 3);
      assert.strictEqual(table.get(0, 0, 0), "hello");
      assert.strictEqual(table.get(1, 2, 3), "there");
      assert.strictEqual(table.get(19, 12, 3), "there");
    });
  });

  it("Shard encode/decoding should work", () => {
    const RADIUS = 3;
    for (let z = -RADIUS; z <= RADIUS; ++z) {
      for (let y = -RADIUS; y <= RADIUS; ++y) {
        for (let x = -RADIUS; x <= RADIUS; ++x) {
          const shardPos: Vec3 = [x, y, z];
          const shardId = voxeloo.shardEncode(shardPos);
          const afterShardPos = voxeloo.shardDecode(shardId);

          assert.deepEqual(afterShardPos, shardPos);
        }
      }
    }
  });

  it("Typescript and C++ shard encoding are same", () => {
    const RADIUS = 3;
    for (let z = -RADIUS; z <= RADIUS; ++z) {
      for (let y = -RADIUS; y <= RADIUS; ++y) {
        for (let x = -RADIUS; x <= RADIUS; ++x) {
          {
            const shardPos: Vec3 = [x, y, z];
            const shardIdTs = shardEncode(...shardPos);
            const shardIdC = voxeloo.shardEncode(shardPos);

            assert.deepEqual(shardIdTs, shardIdC);
          }
          {
            const shardPos: Vec3 = [x + 500, y, z];
            const shardIdTs = shardEncode(...shardPos);
            const shardIdC = voxeloo.shardEncode(shardPos);

            assert.deepEqual(shardIdTs, shardIdC);
          }
        }
      }
    }
  });

  it("Tensor boundary hashing should work", () => {
    using(new voxeloo.Tensor_U32([32, 32, 32], 0), (t: CppTensor<"U32">) => {
      const bh = t.boundaryHash();
      // Since the tensor is filled with all the same values, the hashes of
      // opposite faces should all be the same.
      assert.equal(bh.faceHashes[Dir.X_NEG], bh.faceHashes[Dir.X_POS]);

      // Hashes between two tensors filled with different values should be
      // different.
      using(new voxeloo.Tensor_U32([32, 32, 32], 1), (t2: CppTensor<"U32">) => {
        const bh2 = t2.boundaryHash();
        assert.notEqual(bh.volumeHash, bh2.volumeHash);
        assert.notEqual(bh.faceHashes[Dir.X_NEG], bh2.faceHashes[Dir.X_NEG]);
        assert.notEqual(bh.faceHashes[Dir.Y_NEG], bh2.faceHashes[Dir.Y_NEG]);
        assert.notEqual(bh.faceHashes[Dir.Z_NEG], bh2.faceHashes[Dir.Z_NEG]);
        assert.notEqual(bh.faceHashes[Dir.X_POS], bh2.faceHashes[Dir.X_POS]);
        assert.notEqual(bh.faceHashes[Dir.Y_POS], bh2.faceHashes[Dir.Y_POS]);
        assert.notEqual(bh.faceHashes[Dir.Z_POS], bh2.faceHashes[Dir.Z_POS]);
      });

      // Hashes between two tensors filled with the same value should be
      // equal.
      using(new voxeloo.Tensor_U32([32, 32, 32], 0), (t2: CppTensor<"U32">) => {
        const bh2 = t2.boundaryHash();
        assert.equal(bh.volumeHash, bh2.volumeHash);
        assert.equal(bh.faceHashes[Dir.X_NEG], bh2.faceHashes[Dir.X_NEG]);
        assert.equal(bh.faceHashes[Dir.Y_NEG], bh2.faceHashes[Dir.Y_NEG]);
        assert.equal(bh.faceHashes[Dir.Z_NEG], bh2.faceHashes[Dir.Z_NEG]);
        assert.equal(bh.faceHashes[Dir.X_POS], bh2.faceHashes[Dir.X_POS]);
        assert.equal(bh.faceHashes[Dir.Y_POS], bh2.faceHashes[Dir.Y_POS]);
        assert.equal(bh.faceHashes[Dir.Z_POS], bh2.faceHashes[Dir.Z_POS]);
      });

      // Tweaking an element on the edge between two faces should change the
      // hash of those two faces (and the volume), but not the other faces.
      using(new voxeloo.Tensor_U32([32, 32, 32], 0), (t2: CppTensor<"U32">) => {
        usingAll(
          [
            new voxeloo.DynamicBuffer_Vec3u(1),
            new voxeloo.DynamicBuffer_U32(1),
          ],
          (posBuffer, valBuffer) => {
            posBuffer.asArray()[0] = 0;
            posBuffer.asArray()[1] = 0;
            posBuffer.asArray()[2] = 16;
            valBuffer.asArray()[0] = 10;

            t2.assign(posBuffer, valBuffer);
          }
        );
        const bh2 = t2.boundaryHash();
        assert.notEqual(bh.volumeHash, bh2.volumeHash);
        assert.notEqual(bh.faceHashes[Dir.X_NEG], bh2.faceHashes[Dir.X_NEG]);
        assert.notEqual(bh.faceHashes[Dir.Y_NEG], bh2.faceHashes[Dir.Y_NEG]);
        assert.equal(bh.faceHashes[Dir.Z_NEG], bh2.faceHashes[Dir.Z_NEG]);
        assert.equal(bh.faceHashes[Dir.X_POS], bh2.faceHashes[Dir.X_POS]);
        assert.equal(bh.faceHashes[Dir.Y_POS], bh2.faceHashes[Dir.Y_POS]);
        assert.equal(bh.faceHashes[Dir.Z_POS], bh2.faceHashes[Dir.Z_POS]);
      });
    });
  });
});
