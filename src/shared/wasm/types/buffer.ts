import type { DataType } from "@/shared/wasm/buffers";

const CONSTRUCTORS = {
  Bool: Uint8Array,
  U8: Uint8Array,
  I8: Int8Array,
  I16: Int16Array,
  I32: Int32Array,
  I64: BigInt64Array,
  U16: Uint16Array,
  U32: Uint32Array,
  U64: BigUint64Array,
  F32: Float32Array,
  F64: Float64Array,
  Vec2i: Int32Array,
  Vec3i: Int32Array,
  Vec4i: Int32Array,
  Vec2u: Int32Array,
  Vec3u: Int32Array,
  Vec4u: Int32Array,
} as const;

export type JsArrayFor<T extends DataType> = InstanceType<
  (typeof CONSTRUCTORS)[T]
>;

export function jsArrayFor<T extends DataType, A extends [...any]>(
  t: T,
  ...args: [...A]
): JsArrayFor<T> {
  return new CONSTRUCTORS[t](...args) as JsArrayFor<T>;
}

export interface DynamicBuffer<T extends DataType> {
  step: number;
  size(): number;
  resize(size: number): number;
  asArray(): JsArrayFor<T>;
  assign(data: JsArrayFor<T>): void;
  delete(): void;
}

interface DynamicBufferCtor_Bool {
  new (size?: number): DynamicBuffer<"Bool">;
}
interface DynamicBufferCtor_I8 {
  new (size?: number): DynamicBuffer<"I8">;
}
interface DynamicBufferCtor_I16 {
  new (size?: number): DynamicBuffer<"I16">;
}
interface DynamicBufferCtor_I32 {
  new (size?: number): DynamicBuffer<"I32">;
}
interface DynamicBufferCtor_I64 {
  new (size?: number): DynamicBuffer<"I64">;
}
interface DynamicBufferCtor_U8 {
  new (size?: number): DynamicBuffer<"U8">;
}
interface DynamicBufferCtor_U16 {
  new (size?: number): DynamicBuffer<"U16">;
}
interface DynamicBufferCtor_U32 {
  new (size?: number): DynamicBuffer<"U32">;
}
interface DynamicBufferCtor_U64 {
  new (size?: number): DynamicBuffer<"U64">;
}
interface DynamicBufferCtor_F32 {
  new (size?: number): DynamicBuffer<"F32">;
}
interface DynamicBufferCtor_F64 {
  new (size?: number): DynamicBuffer<"F64">;
}
interface DynamicBufferCtor_Vec2i {
  new (size?: number): DynamicBuffer<"Vec2i">;
}
interface DynamicBufferCtor_Vec3i {
  new (size?: number): DynamicBuffer<"Vec3i">;
}
interface DynamicBufferCtor_Vec4i {
  new (size?: number): DynamicBuffer<"Vec4i">;
}
interface DynamicBufferCtor_Vec2u {
  new (size?: number): DynamicBuffer<"Vec2u">;
}
interface DynamicBufferCtor_Vec3u {
  new (size?: number): DynamicBuffer<"Vec3u">;
}
interface DynamicBufferCtor_Vec4u {
  new (size?: number): DynamicBuffer<"Vec4u">;
}

export interface BufferModule {
  DynamicBuffer_Bool: DynamicBufferCtor_Bool;
  DynamicBuffer_I8: DynamicBufferCtor_I8;
  DynamicBuffer_I16: DynamicBufferCtor_I16;
  DynamicBuffer_I32: DynamicBufferCtor_I32;
  DynamicBuffer_I64: DynamicBufferCtor_I64;
  DynamicBuffer_U8: DynamicBufferCtor_U8;
  DynamicBuffer_U16: DynamicBufferCtor_U16;
  DynamicBuffer_U32: DynamicBufferCtor_U32;
  DynamicBuffer_U64: DynamicBufferCtor_U64;
  DynamicBuffer_F32: DynamicBufferCtor_F32;
  DynamicBuffer_F64: DynamicBufferCtor_F64;
  DynamicBuffer_Vec2i: DynamicBufferCtor_Vec2i;
  DynamicBuffer_Vec3i: DynamicBufferCtor_Vec3i;
  DynamicBuffer_Vec4i: DynamicBufferCtor_Vec4i;
  DynamicBuffer_Vec2u: DynamicBufferCtor_Vec2u;
  DynamicBuffer_Vec3u: DynamicBufferCtor_Vec3u;
  DynamicBuffer_Vec4u: DynamicBufferCtor_Vec4u;
}
