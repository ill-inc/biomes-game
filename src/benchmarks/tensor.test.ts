import { loadVoxeloo } from "@/server/shared/voxeloo";
import { using } from "@/shared/deletable";
import type { VoxelooModule } from "@/shared/wasm/types";

describe("Tensor operations benchmarks", () => {
  let voxeloo!: VoxelooModule;
  beforeEach(async () => {
    voxeloo = await loadVoxeloo();
  });

  // Mostly zeroes.
  it("toTerrainTensor sparse empty", () => {
    using(new voxeloo.VolumeBlock_U32(), (block) => {
      block.set(1, 0, 1, 1);
      block.set(2, 1, 2, 2);
      block.set(3, 2, 0, 3);
      block.set(1, 3, 4, 4);
      const NUM_BENCHMARK_ITERATIONS = 10000;
      for (let i = 0; i < NUM_BENCHMARK_ITERATIONS; ++i) {
        using(voxeloo.toTerrainTensor(block), (_tensor) => {});
      }
    });
  });

  // Mostly non-zeroes.
  it("toTerrainTensor sparse full", () => {
    using(new voxeloo.VolumeBlock_U32(), (block) => {
      block.fill(10);
      block.set(1, 0, 1, 1);
      block.set(2, 1, 2, 2);
      block.set(3, 2, 0, 3);
      block.set(1, 3, 4, 4);
      const NUM_BENCHMARK_ITERATIONS = 10000;
      for (let i = 0; i < NUM_BENCHMARK_ITERATIONS; ++i) {
        using(voxeloo.toTerrainTensor(block), (_tensor) => {});
      }
    });
  });
});
