import type { BezierFunctions, Spline } from "@/client/game/util/bezier";
import {
  bezierFunctionsScalar,
  bezierFunctionsVec3,
  bezierMultipleDerivatives,
} from "@/client/game/util/bezier";
import { diffAngle, normalizeAngle } from "@/shared/math/angles";
import { easeOut } from "@/shared/math/easing";
import { add, dot, length, scale, sub } from "@/shared/math/linear";
import type {
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
  Vec3,
} from "@/shared/math/types";
import _, { clamp, sortedIndex } from "lodash";
import * as THREE from "three";

type GradientFn<T> = (g: T, t: number) => T;

export interface Transition<T> {
  target(dst: Readonly<T>): Transition<T>;
  tick(dt: number): Transition<T>;
  done(): boolean;
  get(): T;
}

// Smoothly transition from one target to another while maintaining a continuous
// derivative. Will always aim to have a derivative of zero at the target.
export class BezierTransition<T> implements Transition<T> {
  private t = 0;
  private bezier?: Spline<T>;
  private oneOverDuration: number;

  constructor(
    private readonly bf: BezierFunctions<T>,
    private readonly sumIdentity: Readonly<T>,
    private src: T,
    duration: number,
    // If specified, the midpoint can be used to ensure more (or less) of the
    // transition happens sooner rather than later.
    private midpoint?: ReadonlyVec2
  ) {
    this.oneOverDuration = 1 / duration;
  }

  setDuration(duration: number) {
    this.oneOverDuration = 1 / duration;
  }

  target(dst: T) {
    // If our target changes, create a new Bezier while maintaining the same
    // derivative that we had previously.
    const srcDerivative: T = this.bezier
      ? this.bezier.derivative(this.t)
      : this.sumIdentity;
    if (
      _.isEqual(srcDerivative, this.sumIdentity) &&
      _.isEqual(this.src, dst)
    ) {
      this.bezier = undefined;
      this.t = 1;
    } else {
      const lerp = (a: T, b: T, t: number) =>
        this.bf.add(this.bf.scalarMult(t, this.bf.sub(b, a)), a);
      const maybeMidpointEntry = this.midpoint
        ? [
            {
              point: lerp(this.src, dst, this.midpoint[1]),
              derivative: lerp(
                srcDerivative,
                this.sumIdentity,
                this.midpoint[1]
              ),
              t: this.midpoint[0],
            },
          ]
        : [];

      this.bezier = bezierMultipleDerivatives(this.bf, [
        { point: this.src, derivative: srcDerivative, t: 0 },
        ...maybeMidpointEntry,
        { point: dst, derivative: this.sumIdentity, t: 1 },
      ]);
      this.t = 0;
    }

    return this;
  }

  tick(dt: number) {
    this.t += dt * this.oneOverDuration;
    if (this.t >= 1) {
      this.t = 1;
    }
    if (this.bezier) {
      this.src = this.bezier.value(this.t);
    }

    return this;
  }

  done() {
    return this.t >= 1;
  }

  get() {
    return this.src;
  }
}

export function makeBezierVec3Transition(
  src: ReadonlyVec3,
  duration: number,
  midpoint?: ReadonlyVec2
) {
  return new BezierTransition<Vec3>(
    bezierFunctionsVec3,
    [0, 0, 0] as Vec3,
    [...src],
    duration,
    midpoint
  );
}
export function makeBezierAngleTransition(
  src: number,
  duration: number,
  midpoint?: Vec2
) {
  const transition = new BezierTransition(
    bezierFunctionsScalar,
    0,
    normalizeAngle(src),
    duration,
    midpoint
  );
  const ret = {
    target: (dst: number) => {
      // Make sure we take the shortest path between the src and dst angles.
      transition.target(transition.get() + diffAngle(dst, transition.get()));
      return ret;
    },
    tick: (dt: number) => {
      transition.tick(dt);
      return ret;
    },
    done: () => transition.done(),
    get: () => normalizeAngle(transition.get()),
  };
  return ret;
}

export class ScalarTransition implements Transition<number> {
  private t: number;
  private src: number;
  private dst: number;
  private fn: GradientFn<number>;

  constructor(src: number, fn: GradientFn<number>) {
    this.t = 0;
    this.src = src;
    this.dst = src;
    this.fn = fn;
  }

  target(dst: number) {
    this.dst = dst;
    return this;
  }

  tick(dt: number) {
    const g = this.dst - this.src;
    if (Math.abs(g) < 1e-2) {
      this.t = 0;
      this.src = this.dst;
    } else {
      this.t += dt;
      this.src += this.fn(g, this.t);
    }
    return this;
  }

  done() {
    return this.src == this.dst;
  }

  get() {
    return this.src;
  }
}

export class Vec3Transition implements Transition<Vec3> {
  protected t: number;
  src: Vec3;
  dst: Vec3;
  protected fn: GradientFn<Vec3>;

  constructor(src: Vec3, fn: GradientFn<Vec3>) {
    this.t = 0;
    this.src = src;
    this.dst = src;
    this.fn = fn;
  }

  target(dst: Vec3) {
    this.dst = dst;
    return this;
  }

  tick(dt: number) {
    const g = sub(this.dst, this.src);
    if (dot(g, g) < 1e-5) {
      this.t = 0;
      this.src = this.dst;
    } else {
      this.t += dt;
      this.src = add(this.src, this.fn(g, this.t));
    }
    return this;
  }

  done() {
    return this.src == this.dst;
  }

  get() {
    return this.src;
  }
}

export type TimedCurvePoint = {
  point: Vec3;
  t: number;
};

export type TimedCurve = TimedCurvePoint[];

export type TimedCurveFn = (
  start: Vec3,
  stop: Vec3,
  startTime?: number
) => TimedCurve;

export class Vec3CurveTransition extends Vec3Transition {
  private curveGenFn: TimedCurveFn;
  private tickFn: (t: number) => number;
  private volatile: boolean = false;
  private curve: THREE.CatmullRomCurve3;
  private timePoints: number[];
  private cur: Vec3;

  constructor(
    src: Vec3,
    curveGenFn: TimedCurveFn,
    tickFn?: (t: number) => number,
    volatile: boolean = false
  ) {
    super(src, (g) => g);
    this.timePoints = [0, 0];
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...src),
      new THREE.Vector3(...src),
    ]);
    this.curveGenFn = curveGenFn;
    this.cur = src;
    this.volatile = volatile;

    const subTickFn = tickFn ? tickFn : (t: number) => t;
    this.tickFn = (t: number) => this.curveTime(subTickFn(t));
  }

  generateCurve() {
    const newPoints = this.curveGenFn(this.src, this.dst);
    // lerp between prevCurve and curve if updating mid-curve
    this.timePoints = newPoints.map((pt) => pt.t);
    this.curve = new THREE.CatmullRomCurve3(
      newPoints.map((curvePoint) => new THREE.Vector3(...curvePoint.point))
    );
    return this;
  }

  target(dst: Vec3) {
    const diff = sub(this.dst, dst);
    if (dot(diff, diff) < 1e-3 && this.curve) {
      // don't regen curve if dst hasnt changed
      return this;
    }
    super.target(dst);
    this.generateCurve();
    return this;
  }

  tick(dt: number) {
    this.t += dt;
    if (this.volatile) {
      this.generateCurve();
    }
    this.cur = this.curve.getPoint(this.tickFn(this.t)).toArray();
    return this;
  }

  curveTime(t: number) {
    // map from normal time to curve time
    // specified time points into 0->1 curve range
    const lastPoint = this.timePoints[this.timePoints.length - 1];

    const scaledT = t * lastPoint - this.timePoints[0];

    // search for neighboring points
    const tIndex = sortedIndex(this.timePoints, scaledT);
    const segNum = tIndex - 1;
    const segMin = this.timePoints[tIndex - 1];
    const segMax = this.timePoints[tIndex];

    const segLength = segMax - segMin;
    const segProgress = segLength > 0 ? (scaledT - segMin) / segLength : 1;
    const curveTime = (segProgress + segNum) / this.timePoints.length;
    return clamp(curveTime, 0, 1);
  }

  done() {
    return this.tickFn(this.t) >= 1;
  }

  get() {
    return this.cur;
  }
}

function scalarMomentum(m: number): GradientFn<number> {
  let h = 0;
  return (g) => {
    h += (1 - m) * (g - h);
    return h;
  };
}

function scalarFixedConstant(constant: number): GradientFn<number> {
  return (g) => {
    return constant * g;
  };
}

function scalarDirectionalConstant(
  positive: number,
  negative: number
): GradientFn<number> {
  return (g) => {
    return (g > 0 ? positive : negative) * g;
  };
}

function scalarFixedDuration(duration: number): GradientFn<number> {
  return (g, t) => {
    return easeOut(Math.min(1, t / duration)) * g;
  };
}

function scalarFixedVelocity(velocity: number): GradientFn<number> {
  return (g) => {
    return Math.sign(g) * velocity;
  };
}

function vectorMomentum(m: number): GradientFn<Vec3> {
  let h: Vec3 = [0, 0, 0];
  return (g) => {
    h = add(h, scale(1 - m, sub(g, h)));
    return h;
  };
}

function vectorFixedConstant(constant: number): GradientFn<Vec3> {
  return (g) => {
    return scale(constant, g);
  };
}

function vectorDirectionalConstant(
  positive: number,
  negative: number
): GradientFn<Vec3> {
  return (g) => {
    return [
      (g[0] > 0 ? positive : negative) * g[0],
      (g[1] > 0 ? positive : negative) * g[1],
      (g[2] > 0 ? positive : negative) * g[2],
    ];
  };
}

function vectorFixedDuration(duration: number): GradientFn<Vec3> {
  return (g, t) => {
    return scale(easeOut(Math.min(1, t / duration)), g);
  };
}

function vectorFixedVelocity(velocity: number): GradientFn<Vec3> {
  return (g) => {
    return scale(velocity / length(g), g);
  };
}

export class ScalarTransitionBuilder {
  fn: GradientFn<number> = (g) => g;

  with(fn: GradientFn<number>) {
    const sub = this.fn;
    this.fn = (g: number, t: number) => fn(sub(g, t), t);
    return this;
  }

  withFixedConstant(constant: number) {
    return this.with(scalarFixedConstant(constant));
  }

  withDirectionalConstant(positive: number, negative: number) {
    return this.with(scalarDirectionalConstant(positive, negative));
  }

  withFixedDuration(duration: number) {
    return this.with(scalarFixedDuration(duration));
  }

  withFixedVelocity(velocity: number) {
    return this.with(scalarFixedVelocity(velocity));
  }

  withMomentum(momentum: number) {
    return this.with(scalarMomentum(momentum));
  }

  from(src: number) {
    return new ScalarTransition(src, this.fn);
  }
}

export class Vec3TransitionBuilder {
  fn: GradientFn<Vec3> = (g) => g;

  with(fn: GradientFn<Vec3>) {
    const sub = this.fn;
    this.fn = (g: Vec3, t: number) => fn(sub(g, t), t);
    return this;
  }

  withFixedConstant(constant: number) {
    return this.with(vectorFixedConstant(constant));
  }

  withDirectionalConstant(positive: number, negative: number) {
    return this.with(vectorDirectionalConstant(positive, negative));
  }

  withFixedDuration(duration: number) {
    return this.with(vectorFixedDuration(duration));
  }

  withFixedVelocity(velocity: number) {
    return this.with(vectorFixedVelocity(velocity));
  }

  withMomentum(momentum: number) {
    return this.with(vectorMomentum(momentum));
  }

  from(src: Vec3) {
    return new Vec3Transition(src, this.fn);
  }
}

export class Vec3CurveTransitionBuilder {
  pointGenFn: TimedCurveFn = (src) => [{ point: src, t: 0 }];
  tickFn: (t: number) => number = (t) => t;
  volatile: boolean = false;

  withPoints(pointGenFn: TimedCurveFn, volatile?: boolean) {
    const subFn = this.pointGenFn;
    this.pointGenFn = (src, dst) => {
      const ls = subFn(src, dst);
      const lastPoint = ls[ls.length - 1];
      ls.push(...pointGenFn(lastPoint.point, dst, lastPoint.t));
      return ls;
    };
    this.volatile = this.volatile || !!volatile;
    return this;
  }

  withFixedDuration(duration: number) {
    this.tickFn = (t: number) => t / duration;
    return this;
  }

  from(src: Vec3) {
    return new Vec3CurveTransition(
      src,
      this.pointGenFn,
      this.tickFn,
      this.volatile
    );
  }
}

export function directionalConstantScalarTransition(
  src: number,
  positive = 1.0,
  negative = 1.0
) {
  return new ScalarTransitionBuilder()
    .withDirectionalConstant(positive, negative)
    .from(src);
}

export function fixedConstantScalarTransition(src: number, constant = 1.0) {
  return new ScalarTransitionBuilder().withFixedConstant(constant).from(src);
}

export function fixedDurationScalarTransition(src: number, duration = 1.0) {
  return new ScalarTransitionBuilder().withFixedDuration(duration).from(src);
}

export function fixedVelocityScalarTransition(src: number, velocity = 1.0) {
  return new ScalarTransitionBuilder().withFixedDuration(velocity).from(src);
}

export function smoothConstantScalarTransition(
  src: number,
  constant = 1.0,
  momentum = 0.5
) {
  return new ScalarTransitionBuilder()
    .withFixedConstant(constant)
    .withMomentum(momentum)
    .from(src);
}

export function smoothDurationScalarTransition(
  src: number,
  duration = 1.0,
  momentum = 0.5
) {
  return new ScalarTransitionBuilder()
    .withFixedDuration(duration)
    .withMomentum(momentum)
    .from(src);
}

export function smoothVelocityScalarTransition(
  src: number,
  velocity = 1.0,
  momentum = 0.5
) {
  return new ScalarTransitionBuilder()
    .withFixedVelocity(velocity)
    .withMomentum(momentum)
    .from(src);
}

export function fixedConstantVec3Transition(src: Vec3, constant = 1.0) {
  return new Vec3TransitionBuilder().withFixedConstant(constant).from(src);
}

export function directionalConstantVec3Transition(
  src: Vec3,
  positive = 1.0,
  negative = 1.0
) {
  return new Vec3TransitionBuilder()
    .withDirectionalConstant(positive, negative)
    .from(src);
}

export function fixedDurationVec3Transition(src: Vec3, duration = 1.0) {
  return new Vec3TransitionBuilder().withFixedDuration(duration).from(src);
}

export function fixedVelocityVec3Transition(src: Vec3, velocity = 1.0) {
  return new Vec3TransitionBuilder().withFixedVelocity(velocity).from(src);
}

export function smoothConstantVec3Transition(
  src: Vec3,
  constant = 1.0,
  momentum = 0.5
) {
  return new Vec3TransitionBuilder()
    .withFixedConstant(constant)
    .withMomentum(momentum)
    .from(src);
}

export function smoothDurationVec3Transition(
  src: Vec3,
  duration = 1.0,
  momentum = 0.5
) {
  return new Vec3TransitionBuilder()
    .withFixedDuration(duration)
    .withMomentum(momentum)
    .from(src);
}

export function smoothVelocityVec3Transition(
  src: Vec3,
  velocity = 1.0,
  momentum = 0.5
) {
  return new Vec3TransitionBuilder()
    .withFixedVelocity(velocity)
    .withMomentum(momentum)
    .from(src);
}

export function fixedDurationVec3Curve(
  src: Vec3,
  genCurveFn: TimedCurveFn,
  duration = 1.0,
  volatile?: boolean
) {
  return new Vec3CurveTransitionBuilder()
    .withPoints(genCurveFn, volatile)
    .withFixedDuration(duration)
    .from(src);
}
