import { loadVoxeloo } from "@/server/shared/voxeloo";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { BufferedTerrainTensor } from "@/shared/game/terrain/buffering/buffered_terrain_tensor";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

describe("Tests for buffered terrain tensor", () => {
  let voxeloo: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let backing: Tensor<"U8">;
  let buffered: BufferedTerrainTensor<"U8">;

  beforeEach(() => {
    backing = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
    backing.fill(42);
    buffered = new BufferedTerrainTensor(voxeloo, "U8", SHARD_SHAPE, backing);
  });

  afterEach(() => {
    backing.delete();
  });

  it("Correctly shields the backing", () => {
    assert.equal(buffered.get(0, 1, 2), 42);
    buffered.fill(5);
    assert.equal(buffered.get(0, 1, 2), 5);
    assert.equal(backing.get(0, 1, 2), 42);
    buffered.commit();
    assert.equal(buffered.get(0, 1, 2), 5);
    assert.equal(backing.get(0, 1, 2), 5);
  });

  it("Supports abandoning changes", () => {
    buffered.fill(5);
    buffered.abandon();
    buffered.fill(6);
    buffered.commit();
    assert.equal(backing.get(0, 1, 2), 6);
    assert.equal(backing.get(1, 2, 3), 6);
  });

  it("Supports overwriting", () => {
    assert.equal(buffered.get(0, 1, 2), 42);
    buffered.set(0, 1, 2, 24);
    assert.equal(buffered.get(0, 1, 2), 24);
    assert.equal(backing.get(0, 1, 2), 42);
    buffered.commit();
    assert.equal(buffered.get(0, 1, 2), 24);
    assert.equal(backing.get(0, 1, 2), 24);
  });

  it("Can be filled", () => {
    buffered.fill(5);
    assert.equal(buffered.get(0, 1, 2), 5);
    assert.equal(buffered.get(1, 2, 3), 5);
    buffered.set(1, 2, 3, 24);
    assert.equal(buffered.get(0, 1, 2), 5);
    assert.equal(buffered.get(2, 1, 0), 5);
    assert.equal(buffered.get(1, 2, 3), 24);
    buffered.commit();
    assert.equal(backing.get(0, 1, 2), 5);
    assert.equal(backing.get(2, 1, 0), 5);
    assert.equal(backing.get(1, 2, 3), 24);
  });
});
