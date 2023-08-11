import type { Dim } from "@/cayley/numerics/runtime";
import { assert } from "@/cayley/numerics/util";

export type Coord1 = [number];
export type Coord2 = [number, number];
export type Coord3 = [number, number, number];
export type Coord4 = [number, number, number, number];
export type Coord5 = [number, number, number, number, number];

export type Coord = Coord1 | Coord2 | Coord3 | Coord4 | Coord5;
export type Shape = Coord;

export type Partial0 = [];
export type Partial1 = Coord1 | Partial0;
export type Partial2 = Coord2 | Partial1;
export type Partial3 = Coord3 | Partial2;
export type Partial4 = Coord4 | Partial3;
export type Partial5 = Coord5 | Partial4;

export type AddOne<C extends Coord> = C extends Partial4
  ? [number, ...C]
  : never;

export type CoordByDim<D extends Dim> = D extends 1
  ? Coord1
  : D extends 2
  ? Coord2
  : D extends 3
  ? Coord3
  : D extends 4
  ? Coord4
  : D extends 5
  ? Coord5
  : never;

export type DimByCoord<C extends Coord> = C extends Coord1
  ? 1
  : C extends Coord2
  ? 2
  : C extends Coord3
  ? 3
  : C extends Coord4
  ? 4
  : C extends Coord5
  ? 5
  : never;

export function isCoord(pos: number[]): pos is Coord {
  return 1 <= pos.length && pos.length <= 5;
}

export function assertCoord(pos: number[]): asserts pos is Coord {
  assert(isCoord(pos));
}

export function coordDim<C extends Coord>(pos: Coord) {
  return pos.length as DimByCoord<C>;
}

export function isCoordDim<D extends Dim>(
  coord: Coord,
  dim: D
): coord is CoordByDim<D> {
  return coordDim(coord) === dim;
}

export function assertCoordDim<D extends Dim>(
  coord: Coord,
  dim: D
): asserts coord is CoordByDim<D> {
  assert(coordDim(coord) === dim);
}

export function arrayIndex(shape: Shape, coord: Coord) {
  let ret = 0;
  for (let i = 0; i < shape.length; i += 1) {
    ret *= shape[i];
    ret += coord[i];
  }
  return ret;
}

export function arrayLength(shape: Shape) {
  let ret = 1;
  for (let i = 0; i < shape.length; i += 1) {
    ret *= shape[i];
  }
  return ret;
}

export function assertShapeIsValid(shape: Shape) {
  for (let i = 0; i < shape.length; i += 1) {
    if (shape[i] < 0) {
      throw new Error(`Invalid shape [${shape}] with negative coordinate`);
    }
  }
}

export function shapesEqual<S extends Shape>(a: S, b: S) {
  return a.every((ai, i) => ai === b[i]);
}

export function assertShapesEqual<S extends Shape>(a: S, b: S) {
  if (!shapesEqual(a, b)) {
    throw new Error(`Expected shape [${a}] to match [${b}]`);
  }
}

export function stepShape<S extends Shape>(shape: S, step: S) {
  return shape.map((s, i) => Math.floor((step[i] + s - 1) / step[i])) as S;
}

export function removeAxis<S extends Partial4 & Shape>(
  shape: S,
  axis: keyof AddOne<S>,
  size = 1
) {
  assert(size > 0);
  const ret = [];
  for (let i = 0; i < shape.length; i += 1) {
    if (i === axis) {
      ret.push(size);
    }
    ret.push(shape[i]);
  }
  if (shape.length === axis) {
    ret.push(size);
  }
  return ret as AddOne<S>;
}

export function insertAxis<S extends Partial4 & Shape>(
  shape: S,
  axis: keyof AddOne<S>,
  size = 1
) {
  assert(size > 0);
  const ret = [];
  for (let i = 0; i < shape.length; i += 1) {
    if (i === axis) {
      ret.push(size);
    }
    ret.push(shape[i]);
  }
  if (shape.length === axis) {
    ret.push(size);
  }
  return ret as AddOne<S>;
}

export type Mask1 = [boolean];
export type Mask2 = [boolean, boolean];
export type Mask3 = [boolean, boolean, boolean];
export type Mask4 = [boolean, boolean, boolean, boolean];
export type Mask5 = [boolean, boolean, boolean, boolean, boolean];

export type Mask<S extends Shape> = S extends Coord1
  ? Mask1
  : S extends Coord2
  ? Mask2
  : S extends Coord3
  ? Mask3
  : S extends Coord4
  ? Mask4
  : S extends Coord5
  ? Mask5
  : never;
