import { ensure } from "@/cayley/numerics/util";
import type { Code, Stack } from "@/wasm/cayley";
import { Runtime } from "@/wasm/cayley";

export const OPS = [
  // Core
  "expand",
  "fill",
  "flip",
  "merge",
  "ref",
  "slice",
  "step",

  // Reshaping
  "reshape_1",
  "reshape_2",
  "reshape_3",
  "reshape_4",
  "reshape_5",

  // Casting
  "cast_bool",
  "cast_u8",
  "cast_u16",
  "cast_u32",
  "cast_u64",
  "cast_i8",
  "cast_i16",
  "cast_i32",
  "cast_i64",
  "cast_f32",
  "cast_f64",

  // Arithmetic
  "add",
  "div",
  "mul",
  "rem",
  "sub",

  // Bitwise
  "bit_and",
  "bit_or",
  "bit_xor",
  "neg",
  "shl",
  "shr",

  // Comparison
  "gt",
  "lt",
  "ge",
  "le",
  "eq",
  "ne",

  // Logical
  "not",
  "and",
  "or",
  "xor",

  // Math
  "max",
  "min",
] as const;

export const VALS = [
  "Bool",
  "U8",
  "U16",
  "U32",
  "U64",
  "I8",
  "I16",
  "I32",
  "I64",
  "F32",
  "F64",
] as const;

export const DIMS = [1, 2, 3, 4, 5] as const;

export type Op = (typeof OPS)[number];
export type Val = (typeof VALS)[number];
export type Dim = (typeof DIMS)[number];

export function toOpName(op: Op, val: Val, dim: Dim) {
  return `${op}_${val}_${dim}`.toLowerCase();
}

const RUNTIME = new Runtime();

const LINKER = (() => {
  const ret = new Map<string, number>();
  for (const op of OPS) {
    for (const val of VALS) {
      for (const dim of DIMS) {
        const name = toOpName(op, val, dim);
        const code = RUNTIME.link(name);
        if (code !== undefined) {
          ret.set(name, code);
        }
      }
    }
  }
  return ret;
})();

export function toOpCode(op: Op, val: Val, dim: Dim) {
  return ensure(LINKER.get(toOpName(op, val, dim)));
}

export function run(stack: Stack, code: Code) {
  RUNTIME.run(stack, code);
}

export function runAndPop(
  type: (typeof VALS)[number],
  stack: Stack,
  code: Code
) {
  RUNTIME.run(stack, code);
  try {
    switch (type) {
      case "Bool":
        return stack.pop_bool();
      case "U8":
        return stack.pop_u8();
      case "U16":
        return stack.pop_u16();
      case "U32":
        return stack.pop_u32();
      case "U64":
        return stack.pop_u64();
      case "I8":
        return stack.pop_i8();
      case "I16":
        return stack.pop_i16();
      case "I32":
        return stack.pop_i32();
      case "I64":
        return stack.pop_i64();
      case "F32":
        return stack.pop_f32();
      case "F64":
        return stack.pop_f64();
    }
  } finally {
    stack.free();
  }
}
