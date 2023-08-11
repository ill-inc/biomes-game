import type { Range } from "@/cayley/numerics/ranges";
import { rangeShape } from "@/cayley/numerics/ranges";
import type { Val } from "@/cayley/numerics/runtime";
import type { Mask, Shape } from "@/cayley/numerics/shapes";
import { stepShape } from "@/cayley/numerics/shapes";
import { assert } from "@/cayley/numerics/util";
import type { JsValue, TypedArray } from "@/cayley/numerics/values";

type Bool = "Bool";
type Integral = "U8" | "U16" | "U32" | "U64" | "I8" | "I16" | "I32" | "I64";
type Float = "F32" | "F64";
type Scalar = Integral | Float;

interface RawExpr<V extends Val, S extends Shape, T> {
  type: V;
  dims: S;
  kind: keyof ExprTypes;
  deps: RawExpr<Val, Shape, unknown>[];
  data: T;
}

export type Expr<V extends Val, S extends Shape> = RawExpr<V, S, unknown>;
export type GenericExpr = Expr<Val, Shape>;

interface CoreExprTypes {
  expand: ReturnType<typeof expand>;
  reshape: ReturnType<typeof reshape>;
  cast: ReturnType<typeof cast>;
  fill: ReturnType<typeof fill>;
  flip: ReturnType<typeof flip>;
  input: ReturnType<typeof input>;
  merge: ReturnType<typeof merge>;
  slice: ReturnType<typeof slice>;
  step: ReturnType<typeof step>;
}

interface ArithmeticExprTypes {
  add: ReturnType<typeof add>;
  div: ReturnType<typeof div>;
  mul: ReturnType<typeof mul>;
  rem: ReturnType<typeof rem>;
  sub: ReturnType<typeof sub>;
}

interface BitwiseExprTypes {
  bit_and: ReturnType<typeof bitAnd>;
  bit_or: ReturnType<typeof bitOr>;
  bit_xor: ReturnType<typeof bitXor>;
  neg: ReturnType<typeof neg>;
  shl: ReturnType<typeof shl>;
  shr: ReturnType<typeof shr>;
}

interface ComparisonExprTypes {
  gt: ReturnType<typeof gt>;
  lt: ReturnType<typeof lt>;
  ge: ReturnType<typeof ge>;
  le: ReturnType<typeof le>;
  eq: ReturnType<typeof eq>;
  ne: ReturnType<typeof ne>;
}

interface LogicalExprTypes {
  not: ReturnType<typeof not>;
  and: ReturnType<typeof and>;
  or: ReturnType<typeof or>;
  xor: ReturnType<typeof xor>;
}

interface MathExprTypes {
  max: ReturnType<typeof max>;
  min: ReturnType<typeof min>;
}

export type ExprTypes = CoreExprTypes &
  ArithmeticExprTypes &
  BitwiseExprTypes &
  ComparisonExprTypes &
  LogicalExprTypes &
  MathExprTypes;

export type TypedExpr<K extends keyof ExprTypes> = ExprTypes[K];

export function isKind<T extends keyof ExprTypes>(
  expr: GenericExpr,
  kind: T
): expr is ExprTypes[T] {
  return expr.kind === kind;
}

export function assertsKind<T extends keyof ExprTypes>(
  expr: GenericExpr,
  kind: T
): asserts expr is ExprTypes[T] {
  if (!isKind(expr, kind)) {
    throw new Error(`Expected expression of kind ${kind} but got ${expr.kind}`);
  }
}

export function isBool<S extends Shape>(
  expr: Expr<Val, S>
): expr is Expr<Bool, S> {
  return expr.type === "Bool";
}

export function isFloat<S extends Shape>(
  expr: Expr<Val, S>
): expr is Expr<Float, S> {
  return expr.type === "F32" || expr.type == "F64";
}

export function isIntegral<S extends Shape>(
  expr: Expr<Val, S>
): expr is Expr<Integral, S> {
  return !isBool(expr) && !isFloat(expr);
}

export function isScalar<S extends Shape>(
  expr: Expr<Val, S>
): expr is Expr<Scalar, S> {
  return isFloat(expr) || isIntegral(expr);
}

export function assertBool<S extends Shape>(
  expr: Expr<Val, S>
): asserts expr is Expr<Bool, S> {
  assert(isBool(expr));
}

export function assertFloat<S extends Shape>(
  expr: Expr<Val, S>
): asserts expr is Expr<Float, S> {
  assert(isFloat(expr));
}

export function assertIntegral<S extends Shape>(
  expr: Expr<Val, S>
): asserts expr is Expr<Integral, S> {
  assert(isIntegral(expr));
}

export function assertScalar<S extends Shape>(
  expr: Expr<Val, S>
): asserts expr is Expr<Scalar, S> {
  assert(isScalar(expr));
}

export function toExpr<V extends Val, S extends Shape, T>(
  type: V,
  dims: S,
  kind: keyof ExprTypes,
  deps: GenericExpr[],
  data: T
) {
  return { type, dims, kind, deps, data } as RawExpr<V, S, T>;
}

export function expand<V extends Val, S extends Shape, S2 extends Shape>(
  src: Expr<V, S>,
  dims: S2
) {
  return toExpr(src.type, dims, "expand", [src], {});
}

export function reshape<V extends Val, S1 extends Shape, S2 extends Shape>(
  src: Expr<V, S1>,
  dims: S2
) {
  return toExpr(src.type, dims, "reshape", [src], {});
}

export function cast<V1 extends Val, V2 extends Val, S extends Shape>(
  src: Expr<V1, S>,
  type: V2
) {
  return toExpr(type, src.dims, "cast", [src], {});
}

export function flip<V extends Val, S extends Shape>(
  src: Expr<V, S>,
  mask: Mask<S>
) {
  return toExpr(src.type, src.dims, "flip", [src], { mask });
}

export function input<V extends Val, S extends Shape>(
  type: V,
  dims: S,
  data: TypedArray<V>,
  name?: string
) {
  return toExpr(type, dims, "input", [], { data, name });
}

export function merge<V extends Val, S extends Shape>(
  dst: Expr<V, S>,
  src: Expr<V, S>,
  range: Range<S>
) {
  return toExpr(dst.type, dst.dims, "merge", [dst, src], { range });
}

export function slice<V extends Val, S extends Shape>(
  src: Expr<V, S>,
  range: Range<S>
) {
  return toExpr(src.type, rangeShape(range), "slice", [src], { range });
}

export function step<V extends Val, S extends Shape>(src: Expr<V, S>, by: S) {
  return toExpr(src.type, stepShape(src.dims, by), "step", [src], { by });
}

export function fill<V extends Val, S extends Shape>(
  type: V,
  dims: S,
  fill: JsValue<V>
) {
  return toExpr(type, dims, "fill", [], { dims, fill });
}

export function add<V extends Scalar, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "add", [l, r], {});
}

export function sub<V extends Scalar, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "sub", [l, r], {});
}

export function mul<V extends Scalar, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "mul", [l, r], {});
}

export function div<V extends Scalar, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "div", [l, r], {});
}

export function rem<V extends Scalar, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "rem", [l, r], {});
}

export function bitAnd<V extends Integral, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "bit_and", [l, r], {});
}

export function bitOr<V extends Integral, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "bit_or", [l, r], {});
}

export function bitXor<V extends Integral, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "bit_xor", [l, r], {});
}

export function neg<V extends Integral, S extends Shape>(l: Expr<V, S>) {
  return toExpr(l.type, l.dims, "neg", [l], {});
}

export function shl<V extends Integral, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "shl", [l, r], {});
}

export function shr<V extends Integral, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "shr", [l, r], {});
}

export function gt<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr("Bool", l.dims, "gt", [l, r], {});
}

export function lt<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr("Bool", l.dims, "lt", [l, r], {});
}

export function ge<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr("Bool", l.dims, "ge", [l, r], {});
}

export function le<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr("Bool", l.dims, "le", [l, r], {});
}

export function eq<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr("Bool", l.dims, "eq", [l, r], {});
}

export function ne<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr("Bool", l.dims, "ne", [l, r], {});
}

export function not<S extends Shape>(l: Expr<"Bool", S>) {
  return toExpr("Bool", l.dims, "not", [l], {});
}

export function and<S extends Shape>(l: Expr<"Bool", S>, r: Expr<"Bool", S>) {
  return toExpr("Bool", l.dims, "and", [l, r], {});
}

export function or<S extends Shape>(l: Expr<"Bool", S>, r: Expr<"Bool", S>) {
  return toExpr("Bool", l.dims, "or", [l, r], {});
}

export function xor<S extends Shape>(l: Expr<"Bool", S>, r: Expr<"Bool", S>) {
  return toExpr("Bool", l.dims, "xor", [l, r], {});
}

export function max<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "max", [l, r], {});
}

export function min<V extends Val, S extends Shape>(
  l: Expr<V, S>,
  r: Expr<V, S>
) {
  return toExpr(l.type, l.dims, "min", [l, r], {});
}
