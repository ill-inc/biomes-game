import { add, mul, sub } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { ok } from "assert";

export type BezierFunctions<T> = {
  scalarMult: (s: number, p: T) => T;
  add: (a: T, b: T) => T;
  sub: (a: T, b: T) => T;
};

export interface Spline<T> {
  value(t: number): T;
  derivative(t: number): T;
}

// The classic extension of a Bezier curve with 4 control points to a Bezier
// over arbitrary number of them. We do this simplistically by just composing
// the base Bezier, which duplicates storage for many control points for the
// benefit of simplicity.
export class CompositeSpline<T> implements Spline<T> {
  constructor(private splines: Spline<T>[], private keyTimes: number[]) {
    ok(splines.length >= 1);
    ok(keyTimes.length === splines.length + 1);
    for (let i = 1; i < keyTimes.length; ++i) {
      ok(keyTimes[i - 1] < keyTimes[i]);
    }
  }

  private splineForT(t: number) {
    let i = 0;
    for (i = 0; i < this.keyTimes.length - 1; ++i) {
      if (t <= this.keyTimes[i + 1]) {
        break;
      }
    }

    ok(t >= this.keyTimes[i]);
    ok(t <= this.keyTimes[i + 1]);

    return this.splines[i];
  }

  value(t: number): T {
    return this.splineForT(t).value(t);
  }

  derivative(t: number): T {
    return this.splineForT(t).derivative(t);
  }
}

export class ScaleOffsetSpline<T> implements Spline<T> {
  private oneOverScale: number;

  constructor(
    private scalarMult: (s: number, p: T) => T,
    private subSpline: Spline<T>,
    private offset: number,
    scale: number
  ) {
    this.oneOverScale = 1 / scale;
  }

  value(t: number): T {
    return this.subSpline.value((t - this.offset) * this.oneOverScale);
  }
  derivative(t: number): T {
    return this.scalarMult(
      this.oneOverScale,
      this.subSpline.derivative((t - this.offset) * this.oneOverScale)
    );
  }
}

// A general bezier curve over points of type T. Note that many bezier curve
// visualizations show a plot of (x, y) control points. That would be akin
// to a Bezier over Vec2 here, and t would be time, not the x coordinate.
export class Bezier<T> implements Spline<T> {
  constructor(
    public readonly f: BezierFunctions<T>,
    public readonly p0: T,
    public readonly p1: T,
    public readonly p2: T,
    public readonly p3: T
  ) {}

  addMany(...x: T[]) {
    return x.reduce(this.f.add);
  }

  value(t: number) {
    const oneMinusT = 1 - t;

    return this.addMany(
      this.f.scalarMult(oneMinusT * oneMinusT * oneMinusT, this.p0),
      this.f.scalarMult(3 * oneMinusT * oneMinusT * t, this.p1),
      this.f.scalarMult(3 * oneMinusT * t * t, this.p2),
      this.f.scalarMult(t * t * t, this.p3)
    );
  }

  derivative(t: number) {
    const oneMinusT = 1 - t;
    return this.addMany(
      this.f.scalarMult(
        3 * oneMinusT * oneMinusT,
        this.f.sub(this.p1, this.p0)
      ),
      this.f.scalarMult(6 * oneMinusT * t, this.f.sub(this.p2, this.p1)),
      this.f.scalarMult(3 * t * t, this.f.sub(this.p3, this.p2))
    );
  }
}
export function bezierSrcDstDerivatives<T>(
  f: BezierFunctions<T>,
  src: T,
  srcDerivative: T,
  dst: T,
  dstDerivative: T
) {
  const oneOverThree = 1 / 3;
  return new Bezier(
    f,
    src,
    f.add(f.scalarMult(oneOverThree, srcDerivative), src),
    f.sub(dst, f.scalarMult(oneOverThree, dstDerivative)),
    dst
  );
}

export const bezierFunctionsScalar: BezierFunctions<number> = {
  scalarMult: (s, v) => s * v,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
};

export const bezierFunctionsVec3: BezierFunctions<Vec3> = {
  scalarMult: mul,
  add: add,
  sub: sub,
};

// Allow creation of a composite piecewise bezier curve based on multiple
// successive points and derivatives at those points.
export function bezierMultipleDerivatives<T>(
  f: BezierFunctions<T>,
  points: { point: T; derivative: T; t: number }[]
): CompositeSpline<T> {
  ok(points.length >= 2);

  const splines: Spline<T>[] = [];
  const keyTimes: number[] = [];

  for (let i = 0; i < points.length - 1; ++i) {
    const offset = points[i].t;
    const span = points[i + 1].t - points[i].t;
    keyTimes.push(offset);

    splines.push(
      new ScaleOffsetSpline(
        f.scalarMult,
        bezierSrcDstDerivatives(
          f,
          points[i].point,
          f.scalarMult(span, points[i].derivative),
          points[i + 1].point,
          f.scalarMult(span, points[i + 1].derivative)
        ),
        offset,
        span
      )
    );
  }
  keyTimes.push(points[points.length - 1].t);

  return new CompositeSpline(splines, keyTimes);
}
