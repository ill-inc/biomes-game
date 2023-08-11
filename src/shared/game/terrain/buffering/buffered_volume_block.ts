import { SHARD_SHAPE } from "@/shared/game/shard";
import { Sparse3 } from "@/shared/util/sparse";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseBlock, VolumeBlock } from "@/shared/wasm/types/biomes";

export class BufferedVolumeBlockU32 {
  private readonly buffer: Sparse3<number>;
  private fillValue?: number;

  constructor(
    private readonly voxeloo: VoxelooModule,
    public backing: VolumeBlock<"U32"> | undefined
  ) {
    this.buffer = new Sparse3(SHARD_SHAPE);
  }

  delete() {
    this.fillValue = undefined;
    this.buffer.clear();
    this.backing?.delete();
  }

  private materializeFillIfNeeded() {
    if (this.fillValue === undefined) {
      return;
    }
    this.buffer.fill(this.fillValue);
    this.fillValue = undefined;
  }

  set(x: number, y: number, z: number, value: number) {
    this.materializeFillIfNeeded();
    this.buffer.set([x, y, z], value);
  }

  get(x: number, y: number, z: number): number {
    return (
      this.fillValue ??
      this.buffer.get([x, y, z]) ??
      this.backing?.get(x, y, z) ??
      0
    );
  }

  fill(value: number): void {
    this.fillValue = value;
    this.buffer.clear();
  }

  assign(edits: SparseBlock<"U32">): void {
    this.materializeFillIfNeeded();
    edits.scan((x, y, z, value) => {
      this.buffer.set([x, y, z], value);
    });
  }

  abandon() {
    this.buffer.clear();
    this.fillValue = undefined;
  }

  get dirty() {
    return this.fillValue !== undefined || this.buffer.size > 0;
  }

  commit() {
    if (!this.dirty) {
      return;
    }
    if (this.backing === undefined) {
      this.backing = new this.voxeloo.VolumeBlock_U32();
    }
    if (this.fillValue !== undefined) {
      this.backing.fill(this.fillValue);
      this.fillValue = undefined;
    } else {
      for (const [pos, value] of this.buffer) {
        this.backing.set(...pos, value);
      }
      this.buffer.clear();
    }
  }
}
