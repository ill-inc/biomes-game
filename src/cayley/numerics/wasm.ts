import type { Val } from "@/cayley/numerics/runtime";
import type { Shape } from "@/cayley/numerics/shapes";
import { unreachable } from "@/cayley/numerics/util";
import type { TypedArray } from "@/cayley/numerics/values";
import { assertArrayType } from "@/cayley/numerics/values";
import {
  ArrayBool,
  ArrayF32,
  ArrayF64,
  ArrayI16,
  ArrayI32,
  ArrayI64,
  ArrayI8,
  ArrayU16,
  ArrayU32,
  ArrayU64,
  ArrayU8,
} from "@/wasm/cayley";

export type WasmArray<V extends Val> = V extends "Bool"
  ? ArrayBool
  : V extends "U8"
  ? ArrayU8
  : V extends "U16"
  ? ArrayU16
  : V extends "U32"
  ? ArrayU32
  : V extends "U64"
  ? ArrayU64
  : V extends "I8"
  ? ArrayI8
  : V extends "I16"
  ? ArrayI16
  : V extends "I32"
  ? ArrayI32
  : V extends "I64"
  ? ArrayI64
  : V extends "F32"
  ? ArrayF32
  : V extends "F64"
  ? ArrayF64
  : never;

export function toWasmArray<V extends Val>(
  val: V,
  dims: Shape,
  array: TypedArray<V>
): WasmArray<V> {
  const shape = new Uint32Array(dims);
  switch (val) {
    case "Bool":
      assertArrayType("Bool", array);
      return ArrayBool.from_data(shape, array) as WasmArray<V>;
    case "U8":
      assertArrayType("U8", array);
      return ArrayU8.from_data(shape, array) as WasmArray<V>;
    case "U16":
      assertArrayType("U16", array);
      return ArrayU16.from_data(shape, array) as WasmArray<V>;
    case "U32":
      assertArrayType("U32", array);
      return ArrayU32.from_data(shape, array) as WasmArray<V>;
    case "U64":
      assertArrayType("U64", array);
      return ArrayU64.from_data(shape, array) as WasmArray<V>;
    case "I8":
      assertArrayType("I8", array);
      return ArrayI8.from_data(shape, array) as WasmArray<V>;
    case "I16":
      assertArrayType("I16", array);
      return ArrayI16.from_data(shape, array) as WasmArray<V>;
    case "I32":
      assertArrayType("I32", array);
      return ArrayI32.from_data(shape, array) as WasmArray<V>;
    case "I64":
      assertArrayType("I64", array);
      return ArrayI64.from_data(shape, array) as WasmArray<V>;
    case "F32":
      assertArrayType("F32", array);
      return ArrayF32.from_data(shape, array) as WasmArray<V>;
    case "F64":
      assertArrayType("F64", array);
      return ArrayF64.from_data(shape, array) as WasmArray<V>;
    default:
      unreachable();
  }
}
