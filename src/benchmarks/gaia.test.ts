import { tensorToMap } from "@/server/gaia_v2/test/simulations.test";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { using } from "@/shared/deletable";
import type { Vec3 } from "@/shared/math/types";
import { Timer } from "@/shared/metrics/timer";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaTerrainMapV2 } from "@/shared/wasm/types/gaia";

const size = 96;
const shape = [size, size, size] as Vec3;

function createRandomScene(
  voxeloo: VoxelooModule,
  lights: number
): GaiaTerrainMapV2 {
  return using(Tensor.make(voxeloo, shape, "U32"), (tensor) => {
    const writer = new TensorUpdate(tensor);

    // Fill dirt
    for (let z = 0; z < size; ++z) {
      for (let y = 0; y < size / 2; ++y) {
        for (let x = 0; x < size; ++x) {
          writer.set([x, y, z], getTerrainID("dirt"));
        }
      }
    }

    // Fill random LED
    for (let i = 0; i < lights; ++i) {
      const x = Math.floor(Math.random() * size);
      const y = size / 2 + Math.floor((Math.random() * size) / 2);
      const z = Math.floor(Math.random() * size);
      writer.set([x, y, z], getTerrainID("led"));
    }

    writer.apply();

    return tensorToMap(voxeloo, tensor);
  });
}

describe("Gaia benchmarks", () => {
  let voxeloo!: VoxelooModule;
  beforeEach(async () => {
    voxeloo = await loadVoxeloo();
  });

  it("Test irradiance update performance", async () => {
    const map = createRandomScene(voxeloo, 100);
    const lightSourceTensor = Tensor.make(voxeloo, [64, 64, 64], "U32");
    let total = 0;
    const iterations = 20;
    for (let i = 0; i < iterations; ++i) {
      const timer = new Timer();
      voxeloo.updateIrradiance(map, [32, 32, 32], lightSourceTensor.cpp);
      total += timer.elapsed;
    }
    const avg = total / iterations;
    // eslint-disable-next-line no-console
    console.log(`Average Time: ${avg}`);
  });
});
