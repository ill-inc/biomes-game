import type {
  Range,
  Range1,
  Range2,
  Range3,
  Range4,
  Range5,
} from "@/cayley/numerics/ranges";
import { assertRangeDim, rangeShape } from "@/cayley/numerics/ranges";
import type { Val } from "@/cayley/numerics/runtime";
import type {
  Coord2,
  Coord3,
  Coord4,
  Coord5,
  Shape,
} from "@/cayley/numerics/shapes";
import { isCoordDim } from "@/cayley/numerics/shapes";
import type { TypedArray } from "@/cayley/numerics/values";

function strides<S extends Shape>(shape: S) {
  const ret = [...shape] as S;
  ret[shape.length - 1] = 1;
  for (let i = shape.length - 2; i >= 0; i -= 1) {
    ret[i] = ret[i + 1] * shape[i + 1];
  }
  return ret;
}

function writeRange1D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [[lo, hi]]: Range1
) {
  dst.set(src.subarray(0, hi - lo) as any, lo);
}

function writeRange2D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride]: Coord2,
  [srcStride]: Coord2,
  [[lo, hi], ...range]: Range2
) {
  let srcOffset = 0;
  let dstOffset = lo * dstStride;
  for (let i = lo; i < hi; i += 1) {
    writeRange1D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

function writeRange3D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride, ...dstStrides]: Coord3,
  [srcStride, ...srcStrides]: Coord3,
  [[lo, hi], ...range]: Range3
) {
  let srcOffset = 0;
  let dstOffset = lo * dstStride;
  for (let i = lo; i < hi; i += 1) {
    writeRange2D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      dstStrides,
      srcStrides,
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

function writeRange4D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride, ...dstStrides]: Coord4,
  [srcStride, ...srcStrides]: Coord4,
  [[lo, hi], ...range]: Range4
) {
  let srcOffset = 0;
  let dstOffset = lo * dstStride;
  for (let i = lo; i < hi; i += 1) {
    writeRange3D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      dstStrides,
      srcStrides,
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

function writeRange5D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride, ...dstStrides]: Coord5,
  [srcStride, ...srcStrides]: Coord5,
  [[lo, hi], ...range]: Range5
) {
  let srcOffset = 0;
  let dstOffset = lo * dstStride;
  for (let i = lo; i < hi; i += 1) {
    writeRange4D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      dstStrides,
      srcStrides,
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

export function writeRange<V extends Val, S extends Shape>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  range: Range<S>,
  shape: S
) {
  if (isCoordDim(shape, 5)) {
    assertRangeDim(range, 5);
    writeRange5D(dst, src, strides(shape), strides(rangeShape(range)), range);
  } else if (isCoordDim(shape, 4)) {
    assertRangeDim(range, 4);
    writeRange4D(dst, src, strides(shape), strides(rangeShape(range)), range);
  } else if (isCoordDim(shape, 3)) {
    assertRangeDim(range, 3);
    writeRange3D(dst, src, strides(shape), strides(rangeShape(range)), range);
  } else if (isCoordDim(shape, 2)) {
    assertRangeDim(range, 2);
    writeRange2D(dst, src, strides(shape), strides(rangeShape(range)), range);
  } else if (isCoordDim(shape, 1)) {
    assertRangeDim(range, 1);
    writeRange1D(dst, src, range);
  }
  return dst;
}

function sliceRange1D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [[lo, hi]]: Range1
) {
  dst.set(src.subarray(lo, hi) as any);
}

function sliceRange2D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride]: Coord2,
  [srcStride]: Coord2,
  [[lo, hi], ...range]: Range2
) {
  let srcOffset = lo * srcStride;
  let dstOffset = 0;
  for (let i = lo; i < hi; i += 1) {
    sliceRange1D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

function sliceRange3D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride, ...dstStrides]: Coord3,
  [srcStride, ...srcStrides]: Coord3,
  [[lo, hi], ...range]: Range3
) {
  let srcOffset = lo * srcStride;
  let dstOffset = 0;
  for (let i = lo; i < hi; i += 1) {
    sliceRange2D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      dstStrides,
      srcStrides,
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

function sliceRange4D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride, ...dstStrides]: Coord4,
  [srcStride, ...srcStrides]: Coord4,
  [[lo, hi], ...range]: Range4
) {
  let srcOffset = lo * srcStride;
  let dstOffset = 0;
  for (let i = lo; i < hi; i += 1) {
    sliceRange3D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      dstStrides,
      srcStrides,
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

function sliceRange5D<V extends Val>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  [dstStride, ...dstStrides]: Coord5,
  [srcStride, ...srcStrides]: Coord5,
  [[lo, hi], ...range]: Range5
) {
  let srcOffset = lo * srcStride;
  let dstOffset = 0;
  for (let i = lo; i < hi; i += 1) {
    sliceRange4D(
      dst.subarray(dstOffset, dstOffset + dstStride),
      src.subarray(srcOffset, srcOffset + srcStride),
      dstStrides,
      srcStrides,
      range
    );
    srcOffset += srcStride;
    dstOffset += dstStride;
  }
}

export function sliceRange<V extends Val, S extends Shape>(
  dst: TypedArray<V>,
  src: TypedArray<V>,
  shape: S,
  range: Range<S>
) {
  if (isCoordDim(shape, 5)) {
    assertRangeDim(range, 5);
    sliceRange5D(dst, src, strides(rangeShape(range)), strides(shape), range);
  } else if (isCoordDim(shape, 4)) {
    assertRangeDim(range, 4);
    sliceRange4D(dst, src, strides(rangeShape(range)), strides(shape), range);
  } else if (isCoordDim(shape, 3)) {
    assertRangeDim(range, 3);
    sliceRange3D(dst, src, strides(rangeShape(range)), strides(shape), range);
  } else if (isCoordDim(shape, 2)) {
    assertRangeDim(range, 2);
    sliceRange2D(dst, src, strides(rangeShape(range)), strides(shape), range);
  } else if (isCoordDim(shape, 1)) {
    assertRangeDim(range, 1);
    sliceRange1D(dst, src, range);
  }
  return dst;
}
