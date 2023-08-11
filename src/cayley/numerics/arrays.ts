import { sliceRange, writeRange } from "@/cayley/numerics/addressing";
import { compile } from "@/cayley/numerics/compile";
import type { Expr } from "@/cayley/numerics/expression";
import {
  add,
  and,
  assertBool,
  assertIntegral,
  assertScalar,
  bitAnd,
  bitOr,
  bitXor,
  cast,
  div,
  eq,
  expand,
  fill,
  flip,
  ge,
  gt,
  input,
  le,
  lt,
  max,
  merge,
  min,
  mul,
  ne,
  neg,
  not,
  or,
  rem,
  reshape,
  shl,
  shr,
  slice,
  step,
  sub,
  xor,
} from "@/cayley/numerics/expression";
import { prettyPrint } from "@/cayley/numerics/format";
import type { RangeExpr } from "@/cayley/numerics/ranges";
import { rangeShape, resolveRange } from "@/cayley/numerics/ranges";
import { pad } from "@/cayley/numerics/routines";
import type { Val } from "@/cayley/numerics/runtime";
import type {
  Coord,
  Coord1,
  Coord2,
  Coord3,
  Coord4,
  Coord5,
  Mask,
  Shape,
} from "@/cayley/numerics/shapes";
import { coordDim } from "@/cayley/numerics/shapes";

import { assertCoord } from "@/cayley/numerics/shapes";

import {
  arrayIndex,
  arrayLength,
  assertShapeIsValid,
  isCoordDim,
  shapesEqual,
} from "@/cayley/numerics/shapes";
import { assert } from "@/cayley/numerics/util";
import type { JsArray, JsValue, TypedArray } from "@/cayley/numerics/values";
import {
  assertArrayType,
  assertBigint,
  assertNumber,
  castTypedArray,
  cloneTypedArray,
  defaultJsValue,
  isArrayType,
  isJsValue,
  jsArrayOfShape,
  makeTypedArray,
  shapeOfJsArray,
  typedArrayOf,
  typedArrayOfShape,
} from "@/cayley/numerics/values";
import type { WasmArray } from "@/cayley/numerics/wasm";
import { toWasmArray } from "@/cayley/numerics/wasm";

export type Broadcastable<V extends Val, S extends Shape> =
  | JsValue<V>
  | TypedArray<V>
  | ArrayOf<V, S>
  | ArrayExpr<V, S>
  | JsArray<V, S>;

export function broadcastOrThrow<V extends Val, S extends Shape>(
  val: V,
  shape: S,
  value: Broadcastable<V, S>
): ArrayExpr<V, S> {
  if (isJsValue(val, value)) {
    return ArrayExpr.fill(val, shape, value);
  } else if (isArrayType(val, value)) {
    return ArrayExpr.from(val, shape, value);
  } else if (value.constructor === ArrayOf) {
    return conformShape(value.view(), shape);
  } else if (value.constructor === ArrayExpr) {
    return conformShape(value, shape);
  } else if (value instanceof Array) {
    const from = shapeOfJsArray(value);
    const typed = typedArrayOfShape(val, from, value);
    return conformShape(ArrayExpr.from(val, from, typed), shape);
  } else {
    throw new Error("Attempt to broadcast an invalid type.");
  }
}

function conformShape<V extends Val, S extends Shape>(
  expr: ArrayExpr<V, Shape>,
  shape: S
) {
  if (shapesEqual(expr.shape, shape)) {
    return expr as ArrayExpr<V, S>;
  } else {
    return expr.expand(shape);
  }
}

export class ArrayExpr<V extends Val, S extends Shape> {
  constructor(private expr: Expr<V, S>) {}

  get shape() {
    return this.expr.dims;
  }

  static from<V extends Val, S extends Shape>(
    type: V,
    shape: S,
    data: TypedArray<V>
  ) {
    return new ArrayExpr<V, S>(input(type, shape, data));
  }

  static fill<V extends Val, S extends Shape>(
    type: V,
    shape: S,
    val: JsValue<V> = defaultJsValue(type)
  ) {
    return new ArrayExpr<V, S>(fill(type, shape, val));
  }

  broadcast(other: Broadcastable<V, S>): ArrayExpr<V, S> {
    return broadcastOrThrow(this.expr.type, this.expr.dims, other);
  }

  slice(range: RangeExpr<S>) {
    const over = resolveRange(this.shape, range);
    return new ArrayExpr<V, S>(slice(this.expr, over));
  }

  merge(range: RangeExpr<S>, other: Broadcastable<V, S>) {
    const over = resolveRange(this.shape, range);
    return new ArrayExpr<V, S>(
      merge(
        this.expr,
        broadcastOrThrow<V, S>(this.expr.type, rangeShape(over), other).expr,
        over
      )
    );
  }

  expand<S2 extends Shape>(shape: S2) {
    assert(coordDim(this.shape) == coordDim(shape));
    assert(this.shape.every((d, i) => d === 1 || d == shape[i]));
    return new ArrayExpr<V, S2>(expand(this.expr, shape));
  }

  reshape<S2 extends Shape>(shape: S2) {
    assert(arrayLength(this.shape) === arrayLength(shape));
    return new ArrayExpr<V, S2>(reshape(this.expr, shape));
  }

  cast<V2 extends Val>(to: V2) {
    assert(this.expr.type != "Bool" || !["F32", "F64"].includes(to));
    return new ArrayExpr<V2, S>(cast(this.expr, to));
  }

  flip(mask: Mask<S>) {
    return new ArrayExpr<V, S>(flip(this.expr, mask));
  }

  step(by: S) {
    return new ArrayExpr<V, S>(step(this.expr, by));
  }

  add(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertScalar(arg);
    assertScalar(this.expr);
    return new ArrayExpr<V, S>(add(this.expr, arg));
  }

  div(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertScalar(arg);
    assertScalar(this.expr);
    return new ArrayExpr<V, S>(div(this.expr, arg));
  }

  mul(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertScalar(arg);
    assertScalar(this.expr);
    return new ArrayExpr<V, S>(mul(this.expr, arg));
  }

  rem(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertScalar(arg);
    assertScalar(this.expr);
    return new ArrayExpr<V, S>(rem(this.expr, arg));
  }

  sub(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertScalar(arg);
    assertScalar(this.expr);
    return new ArrayExpr<V, S>(sub(this.expr, arg));
  }

  bitAnd(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertIntegral(arg);
    assertIntegral(this.expr);
    return new ArrayExpr<V, S>(bitAnd(this.expr, arg));
  }

  bitOr(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertIntegral(arg);
    assertIntegral(this.expr);
    return new ArrayExpr<V, S>(bitOr(this.expr, arg));
  }

  bitXor(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertIntegral(arg);
    assertIntegral(this.expr);
    return new ArrayExpr<V, S>(bitXor(this.expr, arg));
  }

  neg() {
    assertIntegral(this.expr);
    return new ArrayExpr<V, S>(neg(this.expr));
  }

  shl(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertIntegral(arg);
    assertIntegral(this.expr);
    return new ArrayExpr<V, S>(shl(this.expr, arg));
  }

  shr(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertIntegral(arg);
    assertIntegral(this.expr);
    return new ArrayExpr<V, S>(shr(this.expr, arg));
  }

  gt(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<"Bool", S>(gt(this.expr, arg));
  }

  lt(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<"Bool", S>(lt(this.expr, arg));
  }

  ge(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<"Bool", S>(ge(this.expr, arg));
  }

  le(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<"Bool", S>(le(this.expr, arg));
  }

  eq(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<"Bool", S>(eq(this.expr, arg));
  }

  ne(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<"Bool", S>(ne(this.expr, arg));
  }

  not() {
    assertBool(this.expr);
    return new ArrayExpr<"Bool", S>(not(this.expr));
  }

  and(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertBool(arg);
    assertBool(this.expr);
    return new ArrayExpr<"Bool", S>(and(this.expr, arg));
  }

  or(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertBool(arg);
    assertBool(this.expr);
    return new ArrayExpr<"Bool", S>(or(this.expr, arg));
  }

  xor(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    assertBool(arg);
    assertBool(this.expr);
    return new ArrayExpr<"Bool", S>(xor(this.expr, arg));
  }

  max(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<V, S>(max(this.expr, arg));
  }

  min(other: Broadcastable<V, S>) {
    const arg = this.broadcast(other).expr;
    return new ArrayExpr<V, S>(min(this.expr, arg));
  }

  pad(lead: S, tail: S, value?: JsValue<V>) {
    return new ArrayExpr<V, S>(pad(this.expr, lead, tail, value));
  }

  materialize() {
    if (this.expr.kind !== "input") {
      this.expr = input(this.expr.type, this.expr.dims, this.eval().data);
    }
  }

  eval(): ArrayOf<V, S> {
    const array = compile(this.expr).run(this.expr.type);
    try {
      const data = array.view().slice();
      assertArrayType(this.expr.type, data);
      return new ArrayOf<V, S>(this.expr.type, this.expr.dims, data);
    } finally {
      array.free();
    }
  }
}

export class ArrayOf<V extends Val, S extends Shape> {
  constructor(
    readonly type: V,
    readonly shape: S,
    readonly data: TypedArray<V>
  ) {
    assertShapeIsValid(shape);
  }

  fill(val: JsValue<V>) {
    if (isArrayType("U64", this.data) || isArrayType("I64", this.data)) {
      assertBigint(val);
      this.data.fill(val);
    } else {
      assertNumber(val);
      this.data.fill(val);
    }
  }

  cast<C extends Val>(type: C) {
    return new ArrayOf<C, S>(type, this.shape, castTypedArray(type, this.data));
  }

  clone() {
    return new ArrayOf<V, S>(
      this.type,
      this.shape,
      this.data.slice() as TypedArray<V>
    );
  }

  get(pos: S) {
    return this.data[arrayIndex(this.shape, pos)] as JsValue<V>;
  }

  set(pos: S, val: JsValue<V>) {
    this.data[arrayIndex(this.shape, pos)] = val;
  }

  view() {
    return ArrayExpr.from(this.type, this.shape, this.data);
  }

  slice(range: RangeExpr<S>) {
    const over = resolveRange(this.shape, range);
    const data = makeTypedArray(this.type, arrayLength(rangeShape(over)));
    return new ArrayOf<V, S>(
      this.type,
      rangeShape(over),
      sliceRange(data, this.data, this.shape, over)
    );
  }

  reshape<S extends Shape>(shape: S) {
    assert(arrayLength(this.shape) === arrayLength(shape));
    return new ArrayOf<V, S>(this.type, shape, cloneTypedArray(this.data));
  }

  assign(range: RangeExpr<S>, other: Broadcastable<V, S>) {
    const over = resolveRange(this.shape, range);
    const expr = broadcastOrThrow(this.type, rangeShape(over), other);
    writeRange(this.data, expr.eval().data, over, this.shape);
  }

  addAssign(range: RangeExpr<S>, other: Broadcastable<V, S>) {
    const over = resolveRange(this.shape, range);
    this.assign(over, this.slice(over).view().add(other));
  }

  divAssign(range: RangeExpr<S>, other: Broadcastable<V, S>) {
    const over = resolveRange(this.shape, range);
    this.assign(range, this.slice(over).view().div(other));
  }

  mulAssign(range: RangeExpr<S>, other: Broadcastable<V, S>) {
    const over = resolveRange(this.shape, range);
    this.assign(range, this.slice(over).view().mul(other));
  }

  remAssign(range: RangeExpr<S>, other: Broadcastable<V, S>) {
    const over = resolveRange(this.shape, range);
    this.assign(range, this.slice(over).view().rem(other));
  }

  subAssign(range: RangeExpr<S>, other: Broadcastable<V, S>) {
    const over = resolveRange(this.shape, range);
    this.assign(range, this.slice(over).view().sub(other));
  }

  wasm() {
    return toWasmArray(this.type, this.shape, cloneTypedArray(this.data));
  }

  js() {
    return jsArrayOfShape(this.shape, this.data);
  }

  str(): string {
    return prettyPrint(this);
  }
}

export type ArrayExpr1<V extends Val> = ArrayExpr<V, Coord1>;
export type ArrayExpr2<V extends Val> = ArrayExpr<V, Coord2>;
export type ArrayExpr3<V extends Val> = ArrayExpr<V, Coord3>;
export type ArrayExpr4<V extends Val> = ArrayExpr<V, Coord4>;
export type ArrayExpr5<V extends Val> = ArrayExpr<V, Coord5>;
export type ArrayExprN<V extends Val> = ArrayExpr<V, Coord>;

export type Array1<V extends Val> = ArrayOf<V, Coord1>;
export type Array2<V extends Val> = ArrayOf<V, Coord2>;
export type Array3<V extends Val> = ArrayOf<V, Coord3>;
export type Array4<V extends Val> = ArrayOf<V, Coord4>;
export type Array5<V extends Val> = ArrayOf<V, Coord5>;
export type ArrayN<V extends Val> = ArrayOf<V, Coord>;

export function isArray1<V extends Val>(array: ArrayN<V>): array is Array1<V> {
  return isCoordDim(array.shape, 1);
}

export function isArray2<V extends Val>(array: ArrayN<V>): array is Array2<V> {
  return isCoordDim(array.shape, 2);
}

export function isArray3<V extends Val>(array: ArrayN<V>): array is Array3<V> {
  return isCoordDim(array.shape, 3);
}

export function isArray4<V extends Val>(array: ArrayN<V>): array is Array4<V> {
  return isCoordDim(array.shape, 4);
}

export function isArray5<V extends Val>(array: ArrayN<V>): array is Array5<V> {
  return isCoordDim(array.shape, 5);
}

export function isArrayOf<V extends Val, S extends Shape>(
  array: ArrayOf<Val, S>,
  type: V
): array is ArrayOf<V, S> {
  return array.type === type;
}

export function assertArray1<V extends Val>(
  array: ArrayN<V>
): asserts array is Array1<V> {
  assert(isArray1(array));
}

export function assertArray2<V extends Val>(
  array: ArrayN<V>
): asserts array is Array2<V> {
  assert(isArray2(array));
}

export function assertArray3<V extends Val>(
  array: ArrayN<V>
): asserts array is Array3<V> {
  assert(isArray3(array));
}

export function assertArray4<V extends Val>(
  array: ArrayN<V>
): asserts array is Array4<V> {
  assert(isArray4(array));
}

export function assertArray5<V extends Val>(
  array: ArrayN<V>
): asserts array is Array5<V> {
  assert(isArray5(array));
}

export function assertArrayOf<V extends Val, S extends Shape>(
  array: ArrayOf<Val, S>,
  type: V
): asserts array is ArrayOf<V, S> {
  assert(isArrayOf(array, type));
}

export function fromBuffer<V extends Val, S extends Shape>(
  type: V,
  shape: S,
  data: TypedArray<V>
) {
  assert(arrayLength(shape) === data.length);
  return new ArrayOf<V, S>(type, shape, cloneTypedArray(data));
}

export function makeArray<V extends Val, S extends Shape>(type: V, shape: S) {
  return fromBuffer(type, shape, makeTypedArray(type, arrayLength(shape)));
}

export function fillArray<V extends Val, S extends Shape>(
  type: V,
  shape: S,
  fill: JsValue<V>
) {
  const ret = makeArray(type, shape);
  ret.fill(fill);
  return ret;
}

export function fromArray<V extends Val, S extends Shape>(
  type: V,
  shape: S,
  values: JsArray<V, S>
) {
  return fromBuffer(type, shape, typedArrayOfShape(type, shape, values));
}

export function fromValues<V extends Val, S extends Shape>(
  type: V,
  shape: S,
  values: JsValue<V>[]
) {
  return fromBuffer(type, shape, typedArrayOf(type, values));
}

export function fromWasm<V extends Val>(type: V, array: WasmArray<V>) {
  const shape = Array.from(array.shape());
  assertCoord(shape);
  return fromBuffer(type, shape, array.view() as TypedArray<V>);
}
