import { Buffer } from "@/cayley/numerics/buffer";
import type { Range } from "@/cayley/numerics/ranges";
import type { Dim, Op, Val } from "@/cayley/numerics/runtime";
import { run, toOpCode } from "@/cayley/numerics/runtime";
import type { Mask, Shape } from "@/cayley/numerics/shapes";
import { assert } from "@/cayley/numerics/util";
import type { JsValue, TypedArray } from "@/cayley/numerics/values";
import { assertArrayType, assertJsValue } from "@/cayley/numerics/values";
import type { WasmArray } from "@/cayley/numerics/wasm";
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
  Code,
  Stack,
} from "@/wasm/cayley";

export class ABI {
  constructor(readonly stack: Stack) {}

  push(val: Val, dims: Shape, array: TypedArray<Val>) {
    const shape = new Uint32Array(dims);
    switch (val) {
      case "Bool":
        assertArrayType("Bool", array);
        this.stack.push_u8(ArrayBool.from_data(shape, array));
        return;
      case "U8":
        assertArrayType("U8", array);
        this.stack.push_u8(ArrayU8.from_data(shape, array));
        return;
      case "U16":
        assertArrayType("U16", array);
        this.stack.push_u16(ArrayU16.from_data(shape, array));
        return;
      case "U32":
        assertArrayType("U32", array);
        this.stack.push_u32(ArrayU32.from_data(shape, array));
        return;
      case "U64":
        assertArrayType("U64", array);
        this.stack.push_u64(ArrayU64.from_data(shape, array));
        return;
      case "I8":
        assertArrayType("I8", array);
        this.stack.push_i8(ArrayI8.from_data(shape, array));
        return;
      case "I16":
        assertArrayType("I16", array);
        this.stack.push_i16(ArrayI16.from_data(shape, array));
        return;
      case "I32":
        assertArrayType("I32", array);
        this.stack.push_i32(ArrayI32.from_data(shape, array));
        return;
      case "I64":
        assertArrayType("I64", array);
        this.stack.push_i64(ArrayI64.from_data(shape, array));
        return;
      case "F32":
        assertArrayType("F32", array);
        this.stack.push_f32(ArrayF32.from_data(shape, array));
        return;
      case "F64":
        assertArrayType("F64", array);
        this.stack.push_f64(ArrayF64.from_data(shape, array));
        return;
    }
  }

  pop<V extends Val>(val: V) {
    const ret = (() => {
      switch (val) {
        case "Bool":
          return this.stack.pop_bool();
        case "U8":
          return this.stack.pop_u8();
        case "U16":
          return this.stack.pop_u16();
        case "U32":
          return this.stack.pop_u32();
        case "U64":
          return this.stack.pop_u64();
        case "I8":
          return this.stack.pop_i8();
        case "I16":
          return this.stack.pop_i16();
        case "I32":
          return this.stack.pop_i32();
        case "I64":
          return this.stack.pop_i64();
        case "F32":
          return this.stack.pop_f32();
        case "F64":
          return this.stack.pop_f64();
      }
    })();
    return ret as WasmArray<V>;
  }
}

interface Arg {
  type: Val;
  dims: Shape;
  data: TypedArray<Val>;
  name?: string;
}

export class Program {
  code: Buffer = new Buffer();
  args: Arg[] = [];

  constructor() {}

  input(type: Val, dims: Shape, data: TypedArray<Val>, name?: string) {
    this.args.push({ type, dims, data, name });
  }

  op(op: Op, val: Val, dim: Dim) {
    this.code.pushU32(toOpCode(op, val, dim));
  }

  ref(index: number) {
    this.code.pushU16(index);
  }

  shape(shape: Shape) {
    for (const s of shape) {
      this.code.pushU32(s);
    }
  }

  range(range: Range<Shape>) {
    for (const [s, e] of range) {
      this.code.pushI32(s);
      this.code.pushI32(e);
    }
  }

  mask(mask: Mask<Shape>) {
    for (const m of mask) {
      this.code.pushBool(m);
    }
  }

  value<V extends Val>(val: V, value: JsValue<V>) {
    switch (val) {
      case "Bool":
        assertJsValue("Bool", value);
        this.code.pushU8(value);
        return;
      case "U8":
        assertJsValue("U8", value);
        this.code.pushU8(value);
        return;
      case "U16":
        assertJsValue("U16", value);
        this.code.pushU16(value);
        return;
      case "U32":
        assertJsValue("U32", value);
        this.code.pushU32(value);
        return;
      case "U64":
        assertJsValue("U64", value);
        this.code.pushU64(value);
        return;
      case "I8":
        assertJsValue("I8", value);
        this.code.pushI8(value);
        return;
      case "I16":
        assertJsValue("I16", value);
        this.code.pushI16(value);
        return;
      case "I32":
        assertJsValue("I32", value);
        this.code.pushI32(value);
        return;
      case "I64":
        assertJsValue("I64", value);
        this.code.pushI64(value);
        return;
      case "F32":
        assertJsValue("F32", value);
        this.code.pushF32(value);
        return;
      case "F64":
        assertJsValue("F64", value);
        this.code.pushF64(value);
        return;
    }
  }

  run<V extends Val>(
    out: V,
    assignments: Record<string, TypedArray<Val>> = {}
  ) {
    assert(this.code.length <= 0xffffff);
    const code = new Code(this.code.length);
    this.code.writeTo(code.view_mut());
    const stack = new Stack();
    try {
      const abi = new ABI(stack);
      for (const { type, dims, data, name } of this.args) {
        abi.push(type, dims, assignments[name ?? ""] ?? data);
      }
      run(stack, code);
      return abi.pop<V>(out);
    } catch (error) {
      console.error("Exception (in array program)", error);
      throw error;
    } finally {
      stack.free();
    }
  }
}
