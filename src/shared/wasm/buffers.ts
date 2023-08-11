import type { VoxelooModule } from "@/shared/wasm/types";
import type { DynamicBuffer } from "@/shared/wasm/types/buffer";

export type { DynamicBuffer } from "@/shared/wasm/types/buffer";

const CONSTRUCTORS = {
  Bool: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_Bool(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Uint8Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"Bool">;
  },
  I8: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_I8(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Int8Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"I8">;
  },
  I16: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_I16(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Int16Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"I16">;
  },
  I32: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_I32(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Int32Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"I32">;
  },
  I64: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_U64(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: BigInt64Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"U64">;
  },
  U8: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_U8(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Uint8Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"U8">;
  },
  U16: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_U16(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Uint16Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"U16">;
  },
  U32: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_U32(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Uint32Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"U32">;
  },
  U64: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_U64(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: BigUint64Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"U64">;
  },
  F32: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_F32(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Float32Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"F32">;
  },
  F64: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_F64(size);
    return Object.assign(buffer, {
      step: 1,
      assign(data: Float64Array) {
        buffer.resize(data.length);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"F64">;
  },
  Vec2i: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_Vec2i(size);
    return Object.assign(buffer, {
      step: 2,
      assign(data: Int32Array) {
        buffer.resize(data.length / 2);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"Vec2i">;
  },
  Vec3i: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_Vec3i(size);
    return Object.assign(buffer, {
      step: 3,
      assign(data: Int32Array) {
        buffer.resize(data.length / 3);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"Vec3i">;
  },
  Vec4i: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_Vec4i(size);
    return Object.assign(buffer, {
      step: 4,
      assign(data: Int32Array) {
        buffer.resize(data.length / 4);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"Vec4i">;
  },
  Vec2u: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_Vec2u(size);
    return Object.assign(buffer, {
      step: 2,
      assign(data: Uint32Array) {
        buffer.resize(data.length / 2);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"Vec2u">;
  },
  Vec3u: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_Vec3u(size);
    return Object.assign(buffer, {
      step: 3,
      assign(data: Uint32Array) {
        buffer.resize(data.length / 3);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"Vec3u">;
  },
  Vec4u: (voxeloo: VoxelooModule, size?: number) => {
    const buffer = new voxeloo.DynamicBuffer_Vec4u(size);
    return Object.assign(buffer, {
      step: 4,
      assign(data: Uint32Array) {
        buffer.resize(data.length / 4);
        buffer.asArray().set(data);
      },
    }) as DynamicBuffer<"Vec4u">;
  },
};

type Constructors = typeof CONSTRUCTORS;
export type DataType = keyof Constructors;

export function makeDynamicBuffer<T extends DataType>(
  voxeloo: VoxelooModule,
  dtype: T,
  size: number = 0
) {
  return CONSTRUCTORS[dtype](voxeloo, size) as DynamicBuffer<T>;
}
