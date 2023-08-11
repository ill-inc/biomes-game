import type { ExprTypes, GenericExpr } from "@/cayley/numerics/expression";
import { assertsKind } from "@/cayley/numerics/expression";
import type { Program } from "@/cayley/numerics/program";

type ExprName = keyof ExprTypes;
type Generator = (program: Program, expr: GenericExpr) => void;

const CORE_GENERATORS: [ExprName, Generator][] = [
  ["cast", cast],
  ["expand", expand],
  ["fill", fill],
  ["flip", flip],
  ["input", input],
  ["merge", merge],
  ["reshape", reshape],
  ["slice", slice],
  ["step", step],
];

const ARITHMETIC_GENERATORS: [ExprName, Generator][] = [
  ["add", add],
  ["div", div],
  ["mul", mul],
  ["rem", rem],
  ["sub", sub],
];

const BITWISE_GENERATORS: [ExprName, Generator][] = [
  ["bit_and", bitAnd],
  ["bit_or", bitOr],
  ["bit_xor", bitXor],
  ["neg", neg],
  ["shl", shl],
  ["shr", shr],
];

const COMPARISON_GENERATORS: [ExprName, Generator][] = [
  ["gt", gt],
  ["lt", lt],
  ["ge", ge],
  ["le", le],
  ["eq", eq],
  ["ne", ne],
];

const LOGICAL_GENERATORS: [ExprName, Generator][] = [
  ["not", not],
  ["and", and],
  ["or", or],
  ["xor", xor],
];

const MATH_GENERATORS: [ExprName, Generator][] = [
  ["max", max],
  ["min", min],
];

export const GENERATORS = new Map<ExprName, Generator>([
  ...CORE_GENERATORS,
  ...ARITHMETIC_GENERATORS,
  ...BITWISE_GENERATORS,
  ...COMPARISON_GENERATORS,
  ...LOGICAL_GENERATORS,
  ...MATH_GENERATORS,
]);

export function reshape(program: Program, expr: GenericExpr) {
  assertsKind(expr, "reshape");
  const [val, dim] = [expr.type, expr.deps[0].dims.length];
  switch (expr.dims.length) {
    case 1:
      program.op("reshape_1", val, dim);
      break;
    case 2:
      program.op("reshape_2", val, dim);
      break;
    case 3:
      program.op("reshape_3", val, dim);
      break;
    case 4:
      program.op("reshape_4", val, dim);
      break;
    case 5:
      program.op("reshape_5", val, dim);
      break;
  }
  program.shape(expr.dims);
}

export function cast(program: Program, expr: GenericExpr) {
  assertsKind(expr, "cast");
  const [val, dim] = [expr.deps[0].type, expr.dims.length];
  switch (expr.type) {
    case "Bool":
      program.op("cast_bool", val, dim);
      break;
    case "U8":
      program.op("cast_u8", val, dim);
      break;
    case "U16":
      program.op("cast_u16", val, dim);
      break;
    case "U32":
      program.op("cast_u32", val, dim);
      break;
    case "U64":
      program.op("cast_u64", val, dim);
      break;
    case "I8":
      program.op("cast_i8", val, dim);
      break;
    case "I16":
      program.op("cast_i16", val, dim);
      break;
    case "I32":
      program.op("cast_i32", val, dim);
      break;
    case "I64":
      program.op("cast_i64", val, dim);
      break;
    case "F32":
      program.op("cast_f32", val, dim);
      break;
    case "F64":
      program.op("cast_f64", val, dim);
      break;
  }
}

export function expand(program: Program, expr: GenericExpr) {
  assertsKind(expr, "expand");
  program.op("expand", expr.type, expr.dims.length);
  program.shape(expr.dims);
}

export function fill(program: Program, expr: GenericExpr) {
  assertsKind(expr, "fill");
  program.op("fill", expr.type, expr.dims.length);
  program.shape(expr.dims);
  program.value(expr.type, expr.data.fill);
}

export function flip(program: Program, expr: GenericExpr) {
  assertsKind(expr, "flip");
  program.op("flip", expr.type, expr.dims.length);
  program.mask(expr.data.mask);
}

export function input(program: Program, expr: GenericExpr) {
  assertsKind(expr, "input");
  program.input(expr.type, expr.dims, expr.data.data, expr.data.name);
}

export function merge(program: Program, expr: GenericExpr) {
  assertsKind(expr, "merge");
  program.op("merge", expr.type, expr.dims.length);
  program.range(expr.data.range);
}

export function slice(program: Program, expr: GenericExpr) {
  assertsKind(expr, "slice");
  program.op("slice", expr.type, expr.dims.length);
  program.range(expr.data.range);
}

export function step(program: Program, expr: GenericExpr) {
  assertsKind(expr, "step");
  program.op("step", expr.type, expr.dims.length);
  program.shape(expr.data.by);
}

export function add(program: Program, expr: GenericExpr) {
  assertsKind(expr, "add");
  program.op("add", expr.type, expr.dims.length);
}

export function div(program: Program, expr: GenericExpr) {
  assertsKind(expr, "div");
  program.op("div", expr.type, expr.dims.length);
}

export function mul(program: Program, expr: GenericExpr) {
  assertsKind(expr, "mul");
  program.op("mul", expr.type, expr.dims.length);
}

export function rem(program: Program, expr: GenericExpr) {
  assertsKind(expr, "rem");
  program.op("rem", expr.type, expr.dims.length);
}

export function sub(program: Program, expr: GenericExpr) {
  assertsKind(expr, "sub");
  program.op("sub", expr.type, expr.dims.length);
}

export function bitAnd(program: Program, expr: GenericExpr) {
  assertsKind(expr, "bit_and");
  program.op("bit_and", expr.type, expr.dims.length);
}

export function bitOr(program: Program, expr: GenericExpr) {
  assertsKind(expr, "bit_or");
  program.op("bit_or", expr.type, expr.dims.length);
}

export function bitXor(program: Program, expr: GenericExpr) {
  assertsKind(expr, "bit_xor");
  program.op("bit_xor", expr.type, expr.dims.length);
}

export function neg(program: Program, expr: GenericExpr) {
  assertsKind(expr, "neg");
  program.op("neg", expr.type, expr.dims.length);
}

export function shl(program: Program, expr: GenericExpr) {
  assertsKind(expr, "shl");
  program.op("shl", expr.type, expr.dims.length);
}

export function shr(program: Program, expr: GenericExpr) {
  assertsKind(expr, "shr");
  program.op("shr", expr.type, expr.dims.length);
}

export function gt(program: Program, expr: GenericExpr) {
  assertsKind(expr, "gt");
  program.op("gt", expr.deps[0].type, expr.dims.length);
}

export function lt(program: Program, expr: GenericExpr) {
  assertsKind(expr, "lt");
  program.op("lt", expr.deps[0].type, expr.dims.length);
}

export function ge(program: Program, expr: GenericExpr) {
  assertsKind(expr, "ge");
  program.op("ge", expr.deps[0].type, expr.dims.length);
}

export function le(program: Program, expr: GenericExpr) {
  assertsKind(expr, "le");
  program.op("le", expr.deps[0].type, expr.dims.length);
}

export function eq(program: Program, expr: GenericExpr) {
  assertsKind(expr, "eq");
  program.op("eq", expr.deps[0].type, expr.dims.length);
}

export function ne(program: Program, expr: GenericExpr) {
  assertsKind(expr, "ne");
  program.op("ne", expr.deps[0].type, expr.dims.length);
}

export function not(program: Program, expr: GenericExpr) {
  assertsKind(expr, "not");
  program.op("not", "Bool", expr.dims.length);
}

export function and(program: Program, expr: GenericExpr) {
  assertsKind(expr, "and");
  program.op("and", "Bool", expr.dims.length);
}

export function or(program: Program, expr: GenericExpr) {
  assertsKind(expr, "or");
  program.op("or", "Bool", expr.dims.length);
}

export function xor(program: Program, expr: GenericExpr) {
  assertsKind(expr, "xor");
  program.op("xor", "Bool", expr.dims.length);
}

export function max(program: Program, expr: GenericExpr) {
  assertsKind(expr, "max");
  program.op("max", expr.type, expr.dims.length);
}

export function min(program: Program, expr: GenericExpr) {
  assertsKind(expr, "min");
  program.op("min", expr.type, expr.dims.length);
}
