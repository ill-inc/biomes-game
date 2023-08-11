import type { Dim } from "@/cayley/numerics/runtime";
import type {
  Coord,
  Coord1,
  Coord2,
  Coord3,
  Coord4,
  Coord5,
  Shape,
} from "@/cayley/numerics/shapes";
import { assert } from "@/cayley/numerics/util";

export type Range1 = [Coord2];
export type Range2 = [Coord2, Coord2];
export type Range3 = [Coord2, Coord2, Coord2];
export type Range4 = [Coord2, Coord2, Coord2, Coord2];
export type Range5 = [Coord2, Coord2, Coord2, Coord2, Coord2];

export type Range<C extends Coord> = C extends Coord1
  ? Range1
  : C extends Coord2
  ? Range2
  : C extends Coord3
  ? Range3
  : C extends Coord4
  ? Range4
  : C extends Coord5
  ? Range5
  : never;

export type RangeByDim<D extends Dim> = D extends 1
  ? Range1
  : D extends 2
  ? Range2
  : D extends 3
  ? Range3
  : D extends 4
  ? Range4
  : D extends 5
  ? Range5
  : never;

export function rangeDim(r: Range<Coord>) {
  return r.length;
}

export function isRangeDim<D extends Dim>(
  range: Range<Coord>,
  dim: D
): range is RangeByDim<D> {
  return rangeDim(range) === dim;
}

export function assertRangeDim<D extends Dim>(
  range: Range<Coord>,
  dim: D
): asserts range is RangeByDim<D> {
  assert(rangeDim(range) === dim);
}

export function rangeShape<S extends Shape>(range: Range<S>) {
  return range.map((bound) => bound[1] - bound[0]) as S;
}

type RangeStr1 = `${number | ""}:${number | ""}` | `${number}`;
type RangeStr2 = `${RangeStr1},${RangeStr1}`;
type RangeStr3 = `${RangeStr1},${RangeStr2}`;
type RangeStr4 = `${RangeStr1},${RangeStr3}`;
type RangeStr5 = `${RangeStr1},${RangeStr4}`;
type RangeStr<C extends Coord> =
  | ".."
  | (C extends Coord1
      ? RangeStr1
      : C extends Coord2
      ? RangeStr2
      : C extends Coord3
      ? RangeStr3
      : C extends Coord4
      ? RangeStr4
      : C extends Coord5
      ? RangeStr5
      : never);

export type RangeExpr<C extends Coord> = Range<C> | RangeStr<C>;

function resolveComponent(value: string, bound: number, fallback: number) {
  let ret = (value.trim() && parseInt(value)) || fallback;
  if (ret < 0) {
    ret += bound;
  }
  if (ret < 0) {
    ret = 0;
  }
  return Math.min(ret, bound);
}

function parseRangeExpr<S extends Shape>(shape: S, expr: RangeStr<S>) {
  const ret: Coord2[] = [];
  if (expr === "..") {
    for (let i = 0; i < shape.length; i += 1) {
      ret.push([0, shape[i]]);
    }
  } else {
    const parts = expr.split(",");
    assert(parts.length == shape.length);
    for (let i = 0; i < parts.length; i += 1) {
      if (parts[i].includes(":")) {
        const [lo, hi] = parts[i].split(":");
        ret.push([
          resolveComponent(lo, shape[i], 0),
          resolveComponent(hi, shape[i], shape[i]),
        ]);
      } else {
        const lo = resolveComponent(parts[i], shape[i], 0);
        ret.push([lo, Math.min(lo + 1, shape[i])]);
      }
    }
  }
  return ret as Range<S>;
}

function clampRange<S extends Shape>(range: Range<S>) {
  const ret = [...range] as Range<S>;
  for (let i = 0; i < range.length; i += 1) {
    ret[i][1] = Math.max(ret[i][1], ret[i][0]);
  }
  return ret;
}

export function resolveRange<S extends Shape>(
  shape: S,
  expr: RangeExpr<S>
): Range<S> {
  if (typeof expr === "string") {
    return clampRange(parseRangeExpr(shape, expr));
  } else {
    return clampRange(expr);
  }
}
