import type { ArrayN } from "@/cayley/numerics/arrays";
import { fromBuffer } from "@/cayley/numerics/arrays";
import type { Val } from "@/cayley/numerics/runtime";
import type { Shape } from "@/cayley/numerics/shapes";
import { arrayLength } from "@/cayley/numerics/shapes";
import { unreachable } from "@/cayley/numerics/util";

export function toBytes(array: ArrayN<Val>) {
  return new Uint8Array(
    array.data.buffer,
    array.data.byteOffset,
    array.data.byteLength
  );
}

export function fromBytes(value: Val, shape: Shape, bytes: Uint8Array) {
  switch (value) {
    case "Bool":
      return fromBuffer(
        value,
        shape,
        new Uint8Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "U8":
      return fromBuffer(
        value,
        shape,
        new Uint8Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "U16":
      return fromBuffer(
        value,
        shape,
        new Uint16Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "U32":
      return fromBuffer(
        value,
        shape,
        new Uint32Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "U64":
      return fromBuffer(
        value,
        shape,
        new BigUint64Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "I8":
      return fromBuffer(
        value,
        shape,
        new Int8Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "I16":
      return fromBuffer(
        value,
        shape,
        new Int16Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "I32":
      return fromBuffer(
        value,
        shape,
        new Int32Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "I64":
      return fromBuffer(
        value,
        shape,
        new BigInt64Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "F32":
      return fromBuffer(
        value,
        shape,
        new Float32Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    case "F64":
      return fromBuffer(
        value,
        shape,
        new Float64Array(bytes.buffer, bytes.byteOffset, arrayLength(shape))
      );
    default:
      unreachable();
  }
}
