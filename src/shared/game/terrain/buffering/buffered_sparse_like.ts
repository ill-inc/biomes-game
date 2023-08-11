import type { ReadonlyVec3 } from "@/shared/math/types";
import { Sparse3 } from "@/shared/util/sparse";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseBlock } from "@/shared/wasm/types/biomes";

const UndefinedMarker = Symbol("UndefinedMarker");

export class BufferedSparseBlockU32 {
  private readonly buffer: Sparse3<number | typeof UndefinedMarker>;

  constructor(
    private readonly voxeloo: VoxelooModule,
    shape: ReadonlyVec3,
    public backing: SparseBlock<"U32"> | undefined
  ) {
    this.buffer = new Sparse3(shape);
  }

  delete() {
    this.buffer.clear();
    this.backing?.delete();
  }

  set(x: number, y: number, z: number, value: number): void {
    this.buffer.set([x, y, z], value);
  }

  has(x: number, y: number, z: number): boolean {
    const value = this.buffer.get([x, y, z]);
    if (value !== undefined) {
      return value !== UndefinedMarker;
    }
    return this.backing?.has(x, y, z) ?? false;
  }

  get(x: number, y: number, z: number): number | undefined {
    const value = this.buffer.get([x, y, z]);
    if (value !== undefined) {
      return value === UndefinedMarker ? undefined : value;
    }
    return this.backing?.get(x, y, z);
  }

  del(x: number, y: number, z: number): void {
    this.buffer.set([x, y, z], UndefinedMarker);
  }

  abandon() {
    this.buffer.clear();
  }

  get dirty() {
    return this.buffer.size > 0;
  }

  commit() {
    if (!this.dirty) {
      // Nothing to do.
      return;
    }
    if (this.backing === undefined) {
      this.backing = new this.voxeloo.SparseBlock_U32();
    }
    for (const [pos, value] of this.buffer) {
      if (value === UndefinedMarker) {
        this.backing.del(...pos);
      } else {
        this.backing.set(...pos, value);
      }
    }
    this.buffer.clear();
  }
}
