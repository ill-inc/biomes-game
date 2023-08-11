import type { ReadonlyVec3 } from "@/shared/math/types";
import { Sparse3 } from "@/shared/util/sparse";
import { Tensor, type DataType } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";

export class BufferedTerrainTensor<T extends DataType> {
  private readonly buffer: Sparse3<number>;
  private fillValue?: number;

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly dataType: T,
    shape: ReadonlyVec3,
    public backing: Tensor<T> | undefined
  ) {
    this.buffer = new Sparse3(shape);
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

  set(x: number, y: number, z: number, value: number): void {
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

  fill(value: number) {
    this.fillValue = value;
    this.buffer.clear();
  }

  abandon() {
    this.fillValue = undefined;
    this.buffer.clear();
  }

  get dirty() {
    return this.fillValue !== undefined || this.buffer.size > 0;
  }

  commit() {
    if (!this.dirty) {
      // Nothing to do.
      return;
    }
    if (this.backing === undefined) {
      this.backing = Tensor.make(
        this.voxeloo,
        this.buffer.shape,
        this.dataType
      );
    }
    if (this.fillValue !== undefined) {
      this.backing.fill(this.fillValue);
      this.fillValue = undefined;
      return; // Done.
    }
    this.backing.assign(this.buffer);
    this.buffer.clear();
  }
}
