import type { ArrayOf } from "@/cayley/numerics/arrays";
import { makeArray } from "@/cayley/numerics/arrays";
import type { Range } from "@/cayley/numerics/ranges";
import type { Val } from "@/cayley/numerics/runtime";
import type { AddOne, Partial4, Shape } from "@/cayley/numerics/shapes";
import { shapesEqual } from "@/cayley/numerics/shapes";
import { assert, mapTuple } from "@/cayley/numerics/util";

export function stack<V extends Val, S extends Partial4 & Shape>(
  arrays: ArrayOf<V, S>[]
) {
  assert(arrays.length > 0);
  assert(arrays[0].shape.length < 5);
  assert(arrays.every((array) => shapesEqual(arrays[0].shape, array.shape)));
  return concat(arrays).reshape([
    arrays.length,
    ...arrays[0].shape,
  ] as AddOne<S>);
}

export function concat<V extends Val, S extends Partial4 & Shape>(
  arrays: ArrayOf<V, S>[]
) {
  assert(arrays.length > 0);
  assert(arrays.every((array) => array.type == arrays[0].type));

  // Work the out the dimensions of the sub-arrays.
  const [, ...dstShape] = arrays[0].shape;
  const dstRange = mapTuple(dstShape, (hi) => [0, hi]);

  // Allocate the output array.
  const n = arrays.reduce((sum, array) => sum + array.shape[0], 0);
  const ret = makeArray(arrays[0].type, [n, ...dstShape] as S);

  // Write all sub-arrays to the output array.
  let lo = 0;
  for (const array of arrays) {
    const hi = lo + array.shape[0];
    ret.assign([[lo, hi], ...dstRange] as any as Range<S>, array);
    lo = hi;
  }

  return ret;
}
