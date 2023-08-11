import {
  Bezier,
  bezierFunctionsScalar,
  bezierFunctionsVec3,
  bezierMultipleDerivatives,
  bezierSrcDstDerivatives,
} from "@/client/game/util/bezier";
import type { Vec3 } from "@/shared/math/types";
import assert from "assert";

type AssertNearOptions = { message?: string; tolerance?: number };

function assertNear(a: number, b: number, options?: AssertNearOptions) {
  assert(
    Math.abs(a - b) < (options?.tolerance ?? 0.000001),
    options?.message ?? `Expected '${a}' to be close to '${b}'.`
  );
}

function assertArrayNear(
  a: number[],
  b: number[],
  options?: AssertNearOptions
) {
  const message = options?.message ?? `Expected '${a}' to be close to '${b}'.`;
  assert(a.length === b.length, message);
  for (let i = 0; i < a.length; ++i) {
    assertNear(a[i], b[i], { ...(options ?? {}), message });
  }
}

describe("Bezier", () => {
  it("straight line scalar", async () => {
    const curve = new Bezier(bezierFunctionsScalar, 0, 1 / 3, 2 / 3, 1);
    assertNear(curve.value(0), 0);
    assertNear(curve.derivative(0), 1);
    assertNear(curve.value(0.5), 0.5);
    assertNear(curve.derivative(0.5), 1);
    assertNear(curve.value(1), 1);
    assertNear(curve.derivative(1), 1);
  });

  it("straight line scalar from derivatives", async () => {
    const curve = bezierSrcDstDerivatives(bezierFunctionsScalar, 0, 1, 1, 1);
    assertNear(curve.value(0), 0);
    assertNear(curve.derivative(0), 1);
    assertNear(curve.value(0.5), 0.5);
    assertNear(curve.derivative(0.5), 1);
    assertNear(curve.value(1), 1);
    assertNear(curve.derivative(1), 1);
  });

  it("straight line vector from derivatives", async () => {
    const curve = bezierSrcDstDerivatives<Vec3>(
      bezierFunctionsVec3,
      [0, 0, 0],
      [1, 1, -1],
      [1, 1, -1],
      [1, 1, -1]
    );
    assertArrayNear(curve.value(0), [0, 0, 0]);
    assertArrayNear(curve.derivative(0), [1, 1, -1]);
    assertArrayNear(curve.value(0.5), [0.5, 0.5, -0.5]);
    assertArrayNear(curve.derivative(0.5), [1, 1, -1]);
    assertArrayNear(curve.value(1), [1, 1, -1]);
    assertArrayNear(curve.derivative(1), [1, 1, -1]);
  });

  it("cubic scalar with derivative of zero at endpoints", async () => {
    const curve = bezierSrcDstDerivatives(bezierFunctionsScalar, 0, 0, 1, 0);
    assertNear(curve.value(0), 0);
    assertNear(curve.derivative(0), 0);
    assertNear(curve.value(0.25), 0.15625);
    assertNear(curve.derivative(0.25), 1.125);
    assertNear(curve.value(0.5), 0.5);
    assertNear(curve.derivative(0.5), 1.5);
    assertNear(curve.value(0.75), 0.84375);
    assertNear(curve.derivative(0.75), 1.125);
    assertNear(curve.value(1), 1);
    assertNear(curve.derivative(1), 0);
  });

  it("cubic scalar with derivative of one/zero at respective endpoints", async () => {
    const curve = bezierSrcDstDerivatives(bezierFunctionsScalar, 0, 1, 1, 0);
    assertNear(curve.value(0), 0);
    assertNear(curve.derivative(0), 1);
    assertNear(curve.value(0.25), 0.296875);
    assertNear(curve.derivative(0.25), 1.3125);
    assertNear(curve.value(0.5), 0.625);
    assertNear(curve.derivative(0.5), 1.25);
    assertNear(curve.value(0.75), 0.890625);
    assertNear(curve.derivative(0.75), 0.8125);
    assertNear(curve.value(1), 1);
    assertNear(curve.derivative(1), 0);
  });

  it("piecewise bezier", async () => {
    const curve = bezierMultipleDerivatives(bezierFunctionsScalar, [
      { point: 0, derivative: 1, t: 0 },
      { point: 1, derivative: 1, t: 1 },
      { point: 2, derivative: 0, t: 2 },
      { point: 3, derivative: 1, t: 2.5 },
    ]);

    assertNear(curve.value(0), 0);
    assertNear(curve.derivative(0), 1);
    assertNear(curve.value(0.5), 0.5);
    assertNear(curve.derivative(0.5), 1);

    assertNear(curve.value(0.999999999), 1);
    assertNear(curve.derivative(0.999999999), 1);
    assertNear(curve.value(1), 1);
    assertNear(curve.derivative(1), 1);
    assertNear(curve.value(1.000000001), 1);
    assertNear(curve.derivative(1.000000001), 1);

    assertNear(curve.value(1.5), 1.625);
    assertNear(curve.derivative(1.5), 1.25);
    assertNear(curve.value(2), 2);
    assertNear(curve.derivative(2), 0);

    assertNear(curve.value(2.25), 2.4375);
    assertNear(curve.derivative(2.25), 2.75);
    assertNear(curve.value(2.5), 3);
    assertNear(curve.derivative(2.5), 1);
  });
});
