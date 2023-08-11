import type { Val } from "@/cayley/numerics/runtime";
import type {
  Coord1,
  Coord2,
  Coord3,
  Coord4,
  Coord5,
  Shape,
} from "@/cayley/numerics/shapes";
import { assert, unreachable } from "@/cayley/numerics/util";

export type TypedArray<V extends Val> = V extends "Bool"
  ? Uint8Array
  : V extends "U8"
  ? Uint8Array
  : V extends "U16"
  ? Uint16Array
  : V extends "U32"
  ? Uint32Array
  : V extends "U64"
  ? BigUint64Array
  : V extends "I8"
  ? Int8Array
  : V extends "I16"
  ? Int16Array
  : V extends "I32"
  ? Int32Array
  : V extends "I64"
  ? BigInt64Array
  : V extends "F32"
  ? Float32Array
  : V extends "F64"
  ? Float64Array
  : never;

export function makeTypedArray<V extends Val>(type: V, size: number) {
  const ret = (() => {
    switch (type) {
      case "Bool":
        return new Uint8Array(size);
      case "U8":
        return new Uint8Array(size);
      case "U16":
        return new Uint16Array(size);
      case "U32":
        return new Uint32Array(size);
      case "U64":
        return new BigUint64Array(size);
      case "I8":
        return new Int8Array(size);
      case "I16":
        return new Int16Array(size);
      case "I32":
        return new Int32Array(size);
      case "I64":
        return new BigInt64Array(size);
      case "F32":
        return new Float32Array(size);
      case "F64":
        return new Float64Array(size);
    }
  })();
  return ret as TypedArray<V>;
}

export function castTypedArray<V extends Val>(type: V, src: TypedArray<Val>) {
  const ret = makeTypedArray(type, src.length);
  for (let i = 0; i < src.length; i += 1) {
    if (type === "I64" || type === "U64") {
      ret[i] = BigInt(src[i]);
    } else {
      ret[i] = Number(src[i]);
    }
  }
  return ret;
}

export function typedArrayOf<V extends Val>(type: V, values: JsValue<V>[]) {
  const ret = makeTypedArray(type, values.length);
  for (let i = 0; i < values.length; i += 1) {
    ret[i] = values[i];
  }
  return ret;
}

export function cloneTypedArray<V extends Val>(array: TypedArray<V>) {
  return array.slice() as TypedArray<V>;
}

export function isArrayType<V extends Val>(
  val: V,
  array: unknown
): array is TypedArray<V> {
  switch (val) {
    case "Bool":
      return array instanceof Uint8Array;
    case "U8":
      return array instanceof Uint8Array;
    case "U16":
      return array instanceof Uint16Array;
    case "U32":
      return array instanceof Uint32Array;
    case "U64":
      return array instanceof BigUint64Array;
    case "I8":
      return array instanceof Int8Array;
    case "I16":
      return array instanceof Int16Array;
    case "I32":
      return array instanceof Int32Array;
    case "I64":
      return array instanceof BigInt64Array;
    case "F32":
      return array instanceof Float32Array;
    case "F64":
      return array instanceof Float64Array;
    default:
      unreachable();
  }
}

export function assertArrayType<V extends Val>(
  val: V,
  array: TypedArray<Val>
): asserts array is TypedArray<V> {
  assert(isArrayType(val, array));
}

export type JsValue<V extends Val> = V extends "U64" | "I64" ? bigint : number;

export function defaultJsValue<V extends Val>(val: V) {
  const ret = (() => {
    switch (val) {
      case "U64":
      case "I64":
        return BigInt(0);
      default:
        return 0;
    }
  })();
  return ret as JsValue<V>;
}

export function isBigint(value: unknown): value is bigint {
  return typeof value === "bigint";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isJsValue<V extends Val>(
  val: V,
  value: unknown
): value is JsValue<V> {
  if (val === "U64" || val == "I64") {
    return isBigint(value);
  } else {
    return isNumber(value);
  }
}

export function assertBigint(value: unknown): asserts value is bigint {
  assert(isBigint(value));
}

export function assertNumber(value: unknown): asserts value is number {
  assert(isNumber(value));
}

export function assertJsValue<V extends Val>(
  val: V,
  value: unknown
): asserts value is JsValue<V> {
  assert(isJsValue(val, value));
}

export type JsArray<V extends Val, S extends Shape> = S extends Coord1
  ? JsValue<V>[]
  : S extends Coord2
  ? JsValue<V>[][]
  : S extends Coord3
  ? JsValue<V>[][][]
  : S extends Coord4
  ? JsValue<V>[][][][]
  : S extends Coord5
  ? JsValue<V>[][][][][]
  : never;

export function shapeOfJsArray(array: JsArray<Val, Shape>): Shape {
  const shape: number[] = [];
  const pushShape = (dim: number, array: JsArray<Val, Shape>) => {
    assert(dim <= 5);
    if (dim < shape.length) {
      assert(shape[dim] == array.length);
    } else {
      shape.push(array.length);
    }
    if (array.length > 0 && array[0] instanceof Array) {
      pushShape(dim + 1, array[0]);
    }
  };
  pushShape(0, array);
  return shape as Shape;
}

export function typedArrayOfShape<V extends Val, S extends Shape>(
  type: V,
  shape: S,
  array: JsArray<V, S>
) {
  const values: JsValue<V>[] = [];
  const pushValues = (dim: number, array: JsArray<V, Shape>) => {
    assert(shape[dim] == array.length);
    if (dim == shape.length - 1) {
      values.push(...(array as JsArray<V, Coord1>));
    } else {
      for (const child of array) {
        pushValues(dim + 1, child as JsArray<V, Shape>);
      }
    }
  };
  pushValues(0, array);
  return typedArrayOf(type, values);
}

export function jsArrayOfShape<V extends Val, S extends Shape>(
  shape: S,
  array: TypedArray<V>
) {
  let i = 0;
  const serialize = (dim: number) => {
    const ret: unknown[] = [];
    for (let j = 0; j < shape[dim]; j += 1) {
      if (dim == shape.length - 1) {
        ret.push(array[i++]);
      } else {
        ret.push(serialize(dim + 1));
      }
    }
    return ret;
  };
  return serialize(0) as JsArray<V, S>;
}
