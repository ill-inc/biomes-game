import { using, usingAll } from "@/shared/deletable";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { Sparse3 } from "@/shared/util/sparse";
import { makeDynamicBuffer } from "@/shared/wasm/buffers";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { Vec3i } from "@/shared/wasm/types/common";
import type { CppTensor } from "@/shared/wasm/types/tensors";
import assert, { ok } from "assert";

const CONSTRUCTORS = {
  Bool: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_Bool(shape, fill),
  I8: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_I8(shape, fill),
  I16: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_I16(shape, fill),
  I32: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_I32(shape, fill),
  U8: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_U8(shape, fill),
  U16: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_U16(shape, fill),
  U32: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_U32(shape, fill),
  F32: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_F32(shape, fill),
  F64: (voxeloo: VoxelooModule, shape: Vec3i, fill: number) =>
    new voxeloo.Tensor_F64(shape, fill),
};

type Constructors = typeof CONSTRUCTORS;
export type DataType = keyof Constructors;

export interface TensorSpec<D extends DataType = DataType> {
  shape: ReadonlyVec3;
  dtype: D;
}

export class Tensor<D extends DataType> {
  constructor(
    public readonly voxeloo: VoxelooModule,
    private impl?: CppTensor<D>,
    private readonly spec?: TensorSpec<D>
  ) {
    ok(impl || spec, "Must provide either impl or spec");
  }

  get cpp() {
    if (!this.impl) {
      const CHUNK_DIM = 32;
      const chunkedShape: Vec3i = [
        Math.ceil(this.shape[0] / CHUNK_DIM) * CHUNK_DIM,
        Math.ceil(this.shape[1] / CHUNK_DIM) * CHUNK_DIM,
        Math.ceil(this.shape[2] / CHUNK_DIM) * CHUNK_DIM,
      ];
      this.impl = CONSTRUCTORS[this.dtype](
        this.voxeloo,
        chunkedShape,
        0
      ) as CppTensor<D>;
    }
    return this.impl;
  }

  static make<D extends DataType>(
    voxeloo: VoxelooModule,
    shape: ReadonlyVec3,
    dtype: D
  ) {
    return new Tensor<D>(voxeloo, undefined, {
      shape,
      dtype,
    });
  }

  get shape() {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return this.spec?.shape ?? this.impl!.shape;
  }

  get dtype(): D {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return this.spec?.dtype ?? this.impl!.dtype();
  }

  storageSize() {
    return this.impl?.storageSize() ?? 0;
  }

  get(x: number, y: number, z: number): number {
    return this.impl?.get(x, y, z) ?? 0;
  }

  contains(x: number, y: number, z: number) {
    return this.impl?.contains(x, y, z) ?? false;
  }

  zero() {
    return this.impl?.zero() ?? true;
  }

  chunk(x: number, y: number, z: number) {
    return new Tensor(this.voxeloo, this.cpp.chunk(x, y, z));
  }

  boundaryHash() {
    return this.cpp.boundaryHash();
  }

  load(source?: BlobOrBuffer) {
    if (!source || !source.length) {
      return;
    }
    using(makeDynamicBuffer(this.voxeloo, "U8"), (buffer) => {
      if (typeof source === "string") {
        buffer.assign(Buffer.from(source, "base64"));
      } else {
        buffer.assign(source);
      }
      this.cpp.load(buffer);
    });
  }

  save() {
    return using(makeDynamicBuffer(this.voxeloo, "U8"), (buffer) => {
      this.cpp.save(buffer);
      return Buffer.from(buffer.asArray());
    });
  }

  saveWrapped() {
    return { buffer: this.save() };
  }

  *[Symbol.iterator](): IterableIterator<[Vec3, number]> {
    if (!this.impl) {
      return;
    }
    const posBuffer = makeDynamicBuffer(this.voxeloo, "Vec3u");
    const valBuffer = makeDynamicBuffer(this.voxeloo, this.dtype);
    try {
      this.cpp.toSparse(posBuffer, valBuffer);
      const posArray = posBuffer.asArray();
      const valArray = valBuffer.asArray();
      let i = 0;
      for (const val of valArray) {
        yield [[posArray[i], posArray[i + 1], posArray[i + 2]], val];
        i += 3;
      }
    } finally {
      posBuffer.delete();
      valBuffer.delete();
    }
  }

  *find(target: number): Iterable<Vec3> {
    if (!this.impl && target !== 0) {
      return;
    }
    const posBuffer = makeDynamicBuffer(this.voxeloo, "Vec3u");
    const valBuffer = makeDynamicBuffer(this.voxeloo, this.dtype);
    try {
      this.cpp.find(target, posBuffer, valBuffer);
      const posArray = posBuffer.asArray();
      for (let i = 0; i < posArray.length; i += 3) {
        yield [posArray[i], posArray[i + 1], posArray[i + 2]];
      }
    } finally {
      posBuffer.delete();
      valBuffer.delete();
    }
  }

  fill(value: number) {
    this.cpp.fill(value);
  }

  assign(data: Sparse3<number>) {
    assert.deepEqual(data.shape, this.shape);
    usingAll(
      [
        makeDynamicBuffer(this.voxeloo, "Vec3u", data.size),
        makeDynamicBuffer(this.voxeloo, this.dtype, data.size),
      ],
      (posBuffer, valBuffer) => {
        const posArray = posBuffer.asArray();
        const valArray = valBuffer.asArray();
        let i = 0;
        for (const [pos, val] of data) {
          posArray[3 * i] = pos[0];
          posArray[3 * i + 1] = pos[1];
          posArray[3 * i + 2] = pos[2];
          valArray[i] = val;
          i += 1;
        }
        this.cpp.assign(posBuffer, valBuffer);
      }
    );
  }

  delete() {
    this.impl?.delete();
  }
}

export type BlobOrBuffer = string | Uint8Array;

function bufferEquals(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && Buffer.from(a).equals(b);
}

export function tensorDataDiffers(
  dst: { buffer: Uint8Array },
  src?: { buffer: Uint8Array }
) {
  return !src || !bufferEquals(src.buffer, dst.buffer);
}
export class TensorUpdate<T extends DataType> {
  private buffer: Sparse3<number>;

  constructor(readonly tensor: Tensor<T>) {
    this.buffer = new Sparse3(tensor.shape);
  }

  get([x, y, z]: ReadonlyVec3) {
    return this.buffer.get([x, y, z]) ?? this.tensor.get(x, y, z);
  }

  set([x, y, z]: ReadonlyVec3, value: number) {
    this.buffer.set([x, y, z], value);
  }

  apply() {
    this.tensor.assign(this.buffer);
    this.buffer.clear();
  }
}
