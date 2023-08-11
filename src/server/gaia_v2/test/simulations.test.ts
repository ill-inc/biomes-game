import { loadVoxeloo } from "@/server/shared/voxeloo";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { using } from "@/shared/deletable";
import { SHARD_DIM } from "@/shared/game/shard";
import { distManhattan, equals } from "@/shared/math/linear";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaTerrainMapV2 } from "@/shared/wasm/types/gaia";
import { strictEqual } from "assert";

export function tensorToMap(
  voxeloo: VoxelooModule,
  tensor: Tensor<"U32">
): GaiaTerrainMapV2 {
  return using(new voxeloo.GaiaTerrainMapBuilderV2(), (builder) => {
    // Initialize the map.
    for (let z = 0; z < tensor.shape[2]; z += SHARD_DIM) {
      for (let y = 0; y < tensor.shape[1]; y += SHARD_DIM) {
        for (let x = 0; x < tensor.shape[0]; x += SHARD_DIM) {
          const pos = [x, y, z] as const;
          builder.assignSeedTensor(pos, tensor.chunk(...pos).cpp);
        }
      }
    }

    const map = new voxeloo.GaiaTerrainMapV2();
    builder.build(map);
    return map;
  });
}

describe("Test gaia v2 simulations", () => {
  let voxeloo!: VoxelooModule;
  beforeEach(async () => {
    voxeloo = await loadVoxeloo();
  });

  it("Test irradiance update correctness", async () => {
    const led = [48, 48, 48] as const;
    const lightSourceTensor = Tensor.make(voxeloo, [64, 64, 64], "U32");
    const map = using(Tensor.make(voxeloo, [96, 96, 96], "U32"), (tensor) => {
      const writer = new TensorUpdate(tensor);
      writer.set(led, getTerrainID("led"));
      writer.apply();
      return tensorToMap(voxeloo, tensor);
    });

    using(
      voxeloo.updateIrradiance(map, [32, 32, 32], lightSourceTensor.cpp),
      (map) => {
        for (let z = 32; z < 64; ++z) {
          for (let y = 32; y < 64; ++y) {
            for (let x = 32; x < 64; ++x) {
              const pos = [x, y, z] as const;
              const colour = map.get(pos);
              const expectedIntensity = Math.max(
                0,
                15 - distManhattan(pos, led)
              );
              if (expectedIntensity > 0) {
                strictEqual(
                  colour,
                  (0xffffff00 | expectedIntensity) >>> 0,
                  `${colour.toString(16)}, ${pos}`
                );
              } else {
                strictEqual(
                  colour & 0xff,
                  expectedIntensity,
                  colour.toString(16)
                );
              }
            }
          }
        }
      }
    );
  });

  it("Test occlusion update correctness", async () => {
    const dirt = [16, 16, 16] as const;
    const map = using(Tensor.make(voxeloo, [32, 32, 32], "U32"), (tensor) => {
      const writer = new TensorUpdate(tensor);
      writer.set(dirt, getTerrainID("dirt"));
      writer.apply();
      return tensorToMap(voxeloo, tensor);
    });

    using(voxeloo.updateOcclusion(map, [0, 0]), (occlusion) => {
      for (let z = 0; z < 32; ++z) {
        for (let y = 0; y < 32; ++y) {
          for (let x = 0; x < 32; ++x) {
            const val = occlusion.get([x, y, z]);
            if (equals([x, y, z], dirt)) {
              strictEqual(val, 15);
            } else if (x === dirt[0] && y < dirt[1] && z === dirt[2]) {
              strictEqual(val, 1);
            } else {
              strictEqual(val, 0);
            }
          }
        }
      }
    });
  });
});
