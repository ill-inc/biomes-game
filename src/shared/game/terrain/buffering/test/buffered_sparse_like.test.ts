import { loadVoxeloo } from "@/server/shared/voxeloo";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { BufferedSparseBlockU32 } from "@/shared/game/terrain/buffering/buffered_sparse_like";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseBlock } from "@/shared/wasm/types/biomes";
import assert from "assert";

const FOO = 42;
const BAR = 24;

describe("Tests for buffered sparse-like", () => {
  let voxeloo!: VoxelooModule;
  let backing: SparseBlock<"U32">;
  let buffered: BufferedSparseBlockU32;

  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  beforeEach(() => {
    backing = new voxeloo.SparseBlock_U32();
    buffered = new BufferedSparseBlockU32(voxeloo, SHARD_SHAPE, backing);
  });

  afterEach(() => {
    buffered.delete();
  });

  it("Correctly shields the backing", () => {
    assert.equal(buffered.get(0, 1, 2), undefined);
    buffered.set(0, 1, 2, FOO);
    assert.equal(buffered.get(0, 1, 2), FOO);
    assert.equal(backing.get(0, 1, 2), undefined);
    backing.set(2, 1, 0, BAR);
    assert.equal(buffered.get(2, 1, 0), BAR);
    buffered.commit();
    assert.equal(buffered.get(0, 1, 2), FOO);
    assert.equal(buffered.get(2, 1, 0), BAR);
    assert.equal(backing.get(0, 1, 2), FOO);
  });

  it("Supports deletion", () => {
    backing.set(0, 1, 2, FOO);
    assert.equal(buffered.get(0, 1, 2), FOO);
    buffered.del(0, 1, 2);
    assert.equal(buffered.get(0, 1, 2), undefined);
    assert.equal(backing.get(0, 1, 2), FOO);
    buffered.commit();
    assert.equal(buffered.get(0, 1, 2), undefined);
    assert.equal(backing.get(0, 1, 2), undefined);
  });

  it("Supports abandoning changes", () => {
    buffered.set(0, 1, 2, FOO);
    buffered.abandon();
    buffered.set(1, 2, 3, BAR);
    buffered.commit();
    assert.equal(backing.get(0, 1, 2), undefined);
    assert.equal(backing.get(1, 2, 3), BAR);
  });
});
