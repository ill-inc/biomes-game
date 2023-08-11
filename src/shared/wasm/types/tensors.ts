import type { Vec3 } from "@/shared/math/types";
import type { DataType } from "@/shared/wasm/tensors";
import type { DynamicBuffer } from "@/shared/wasm/types/buffer";
import type { Vec3i } from "@/shared/wasm/types/common";

export interface CppTensor<T extends DataType> {
  shape: Vec3;
  dtype(): T;
  contains(x: number, y: number, z: number): boolean;
  get(x: number, y: number, z: number): number;
  fill(value: number): void;
  zero(): boolean;
  toDense(val: DynamicBuffer<T>): void;
  toSparse(pos: DynamicBuffer<"Vec3u">, val: DynamicBuffer<T>): void;
  find(tgt: number, pos: DynamicBuffer<"Vec3u">, val: DynamicBuffer<T>): void;
  save(buffer: DynamicBuffer<"U8">): void;
  load(buffer: DynamicBuffer<"U8">): void;
  assign(pos: DynamicBuffer<"Vec3u">, val: DynamicBuffer<T>): void;
  chunk(x: number, y: number, z: number): CppTensor<T>;
  delete(): void;
  boundaryHash(): TensorBoundaryHashes;
  storageSize(): number;
}

interface TensorCtor_Bool {
  new (shape: Vec3i, fill: number): CppTensor<"Bool">;
}
interface TensorCtor_I8 {
  new (shape: Vec3i, fill: number): CppTensor<"I8">;
}
interface TensorCtor_I16 {
  new (shape: Vec3i, fill: number): CppTensor<"I16">;
}
interface TensorCtor_I32 {
  new (shape: Vec3i, fill: number): CppTensor<"I32">;
}
interface TensorCtor_U8 {
  new (shape: Vec3i, fill: number): CppTensor<"U8">;
}
interface TensorCtor_U16 {
  new (shape: Vec3i, fill: number): CppTensor<"U16">;
}
interface TensorCtor_U32 {
  new (shape: Vec3i, fill: number): CppTensor<"U32">;
}
interface TensorCtor_F32 {
  new (shape: Vec3i, fill: number): CppTensor<"F32">;
}
interface TensorCtor_F64 {
  new (shape: Vec3i, fill: number): CppTensor<"F64">;
}

export interface TensorBoundaryHashes {
  volumeHash: number;
  faceHashes: [number, number, number, number, number, number];
}
export interface TensorsModule {
  Tensor_Bool: TensorCtor_Bool;
  Tensor_I8: TensorCtor_I8;
  Tensor_I16: TensorCtor_I16;
  Tensor_I32: TensorCtor_I32;
  Tensor_U8: TensorCtor_U8;
  Tensor_U16: TensorCtor_U16;
  Tensor_U32: TensorCtor_U32;
  Tensor_F32: TensorCtor_F32;
  Tensor_F64: TensorCtor_F64;
}
