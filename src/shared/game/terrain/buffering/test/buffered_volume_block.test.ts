import { loadVoxeloo } from "@/server/shared/voxeloo";
import { BufferedVolumeBlockU32 } from "@/shared/game/terrain/buffering/buffered_volume_block";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

describe("Tests for buffered volume block", () => {
  let voxeloo!: VoxelooModule;
  let backing: InstanceType<VoxelooModule["VolumeBlock_U32"]>;
  let buffered: BufferedVolumeBlockU32;

  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  beforeEach(() => {
    backing = new voxeloo.VolumeBlock_U32();
    buffered = new BufferedVolumeBlockU32(voxeloo, backing);
  });

  afterEach(() => {
    backing.delete();
  });

  it("Supports abandoning changes", () => {
    assert.equal(backing.get(0, 1, 2), 0);
    buffered.set(0, 1, 2, 42);
    buffered.abandon();
    buffered.set(1, 2, 3, 1000);
    buffered.commit();
    assert.equal(backing.get(0, 1, 2), 0);
    assert.equal(backing.get(1, 2, 3), 1000);
  });

  it("Correctly shields the backing", () => {
    assert.equal(buffered.get(0, 1, 2), 0);
    buffered.set(0, 1, 2, 42);
    assert.equal(buffered.get(0, 1, 2), 42);
    assert.equal(backing.get(0, 1, 2), 0);
    backing.set(2, 1, 0, 24);
    assert.equal(buffered.get(2, 1, 0), 24);
    buffered.commit();
    assert.equal(buffered.get(0, 1, 2), 42);
    assert.equal(buffered.get(2, 1, 0), 24);
    assert.equal(backing.get(0, 1, 2), 42);
  });

  it("Supports overwriting", () => {
    backing.set(0, 1, 2, 42);
    assert.equal(buffered.get(0, 1, 2), 42);
    buffered.set(0, 1, 2, 24);
    assert.equal(buffered.get(0, 1, 2), 24);
    assert.equal(backing.get(0, 1, 2), 42);
    buffered.commit();
    assert.equal(buffered.get(0, 1, 2), 24);
    assert.equal(backing.get(0, 1, 2), 24);
  });

  it("Can be filled", () => {
    backing.set(0, 1, 2, 42);
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
