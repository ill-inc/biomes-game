import type { MapPreload } from "@/server/map/preload";
import type { MapResources } from "@/server/map/resources";
import { registerResources } from "@/server/map/resources";
import type { TileContext } from "@/server/map/tiles/types";
import type { ImageBox } from "@/server/map/tiles/utils";
import type { WorldHelper } from "@/server/map/world";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { usingAll } from "@/shared/deletable";
import type { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { SHARD_DIM, SHARD_SHAPE, voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { tileName } from "@/shared/map/paths";
import type { TilePos, TileType } from "@/shared/map/types";
import { containsAABB } from "@/shared/math/linear";
import type { ReadonlyAABB, Vec2, Vec3 } from "@/shared/math/types";
import { RegistryBuilder } from "@/shared/registry";
import { saveBlockWrapper } from "@/shared/wasm/biomes";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

function fillTestTensor(
  tensor: Tensor<"U32">,
  base: number,
  incr: Vec2,
  id: TerrainID
) {
  const update = new TensorUpdate(tensor);
  for (let z = 0; z < SHARD_DIM; z += 1) {
    for (let x = 0; x < SHARD_DIM; x += 1) {
      const h = Math.min(base + x * incr[0] + z * incr[1], SHARD_DIM);
      for (let i = 0; i < h; i += 1) {
        update.set([x, i, z], id);
      }
    }
  }
  update.apply();
}

function makeShardSeed(voxeloo: VoxelooModule, pos: Vec3) {
  return usingAll(
    [new voxeloo.VolumeBlock_U32(), Tensor.make(voxeloo, SHARD_SHAPE, "U32")],
    (volume, tensor) => {
      fillTestTensor(tensor, pos[0] - pos[1], [1, 0], getTerrainID("dirt"));
      for (const [pos, val] of tensor) {
        volume.set(...pos, val);
      }
      return saveBlockWrapper(voxeloo, volume);
    }
  );
}

function makeShardDiff(voxeloo: VoxelooModule, pos: Vec3) {
  return usingAll(
    [new voxeloo.SparseBlock_U32(), Tensor.make(voxeloo, SHARD_SHAPE, "U32")],
    (sparse, tensor) => {
      fillTestTensor(tensor, pos[2] - pos[1], [0, 1], getTerrainID("grass"));
      for (const [pos, val] of tensor) {
        if (val > 0) {
          sparse.set(...pos, val);
        }
      }
      return saveBlockWrapper(voxeloo, sparse);
    }
  );
}

class DummyMapPreload implements MapPreload {
  constructor(readonly map = new Map<string, ImageBox>()) {}

  async start() {}

  has(type: TileType, level: number, pos: TilePos) {
    return this.map.has(tileName(type, level, pos));
  }

  get(type: TileType, level: number, pos: TilePos) {
    return async () => this.map.get(tileName(type, level, pos));
  }

  set(type: TileType, level: number, pos: TilePos, img: ImageBox) {
    return this.map.set(tileName(type, level, pos), img);
  }

  del(type: TileType, level: number, pos: TilePos) {
    return this.map.delete(tileName(type, level, pos));
  }
}

class DummyWorldHelper implements WorldHelper {
  constructor(private readonly voxeloo: VoxelooModule) {}

  getWorldBounds(): ReadonlyAABB {
    return [
      [0, 0, 0],
      [64, 64, 64],
    ];
  }

  getTerrainShard(pos: Vec3): ReadonlyEntity | undefined {
    const [[x0, y0, z0], [x1, y1, z1]] = this.getWorldBounds();
    let id = 1;
    for (let z = z0; z < z1; z += SHARD_DIM) {
      for (let y = y0; y < y1; y += SHARD_DIM) {
        for (let x = x0; x < x1; x += SHARD_DIM) {
          if (voxelShard(x, y, z) === voxelShard(...pos)) {
            return <Entity>{
              id: id as BiomesId,
              shard_seed: {
                encoding: 0,
                ...makeShardSeed(this.voxeloo, [x, y, z]),
              },
              shard_diff: {
                encoding: 0,
                ...makeShardDiff(this.voxeloo, [x, y, z]),
              },
            };
          }
          id += 1;
        }
      }
    }
  }

  contains(pos: Vec3) {
    return containsAABB(this.getWorldBounds(), pos);
  }
}

interface TestContext extends TileContext {
  resources: MapResources;
}

describe("Test map height indexing", () => {
  let voxeloo!: VoxelooModule;
  beforeEach(async () => {
    voxeloo = await loadVoxeloo();
  });

  it("Make sure block height is correct", async () => {
    const context = await new RegistryBuilder<TestContext>()
      .bind("resources", registerResources)
      .bind("preload", async () => new DummyMapPreload())
      .bind("worldHelper", async () => new DummyWorldHelper(voxeloo))
      .set("voxeloo", voxeloo)
      .build();

    // Validate tile (0, 0)
    const h00 = await context.resources.get("/tiles/heights", 0, 0);
    const tile00 = h00.block;
    assert.ok(tile00);
    assert.equal(tile00.get([0, 0]), 0);
    assert.equal(tile00.get([31, 0]), 31);
    assert.equal(tile00.get([0, 31]), 31);
    assert.equal(tile00.get([31, 31]), 31);

    // Validate tile (0, 1)
    const h01 = await context.resources.get("/tiles/heights", 0, 32);
    const tile01 = h01.block;
    assert.ok(tile01);
    assert.equal(tile01.get([0, 0]), 32);
    assert.equal(tile01.get([31, 0]), 63);
    assert.equal(tile01.get([0, 31]), 32);
    assert.equal(tile01.get([31, 31]), 63);

    // Validate tile (1, 0)
    const h10 = await context.resources.get("/tiles/heights", 32, 0);
    const tile10 = h10.block;
    assert.ok(tile10);
    assert.equal(tile10.get([0, 0]), 32);
    assert.equal(tile10.get([31, 0]), 32);
    assert.equal(tile10.get([0, 31]), 63);
    assert.equal(tile10.get([31, 31]), 63);

    // Validate tile (1, 1)
    const h11 = await context.resources.get("/tiles/heights", 32, 32);
    const tile11 = h11.block;
    assert.ok(tile11);
    assert.equal(tile11.get([0, 0]), 32);
    assert.equal(tile11.get([31, 0]), 63);
    assert.equal(tile11.get([0, 31]), 63);
    assert.equal(tile11.get([31, 31]), 63);
  });
});
