import type {
  AxisAngle,
  EulerAngles,
  Quaternion,
} from "@/shared/math/quaternions";
import {
  quatDot,
  quatFromAxisAngle,
  quatFromEuler,
  quatIdentity,
  quatMul,
  quatNeg,
  quatPow,
  quatSlerp,
  quatToAxisAngle,
  quatToEuler,
  quatToMatrix,
} from "@/shared/math/quaternions";
import type { AssertNearOptions } from "@/shared/math/test";
import { assertNear, assertNearArray } from "@/shared/math/test";
import assert from "assert";

function assertNearQuat(a: Quaternion, b: Quaternion) {
  assertNearArray(a, b);
}
function assertNearAxisAngle(
  a: AxisAngle,
  b: AxisAngle,
  options?: AssertNearOptions
) {
  const subOptions = {
    ...(options ?? {}),
    message:
      options?.message ??
      `Expected '${JSON.stringify(a)}' to be close to '${JSON.stringify(b)}'.`,
  };

  assertNear(a.angle, b.angle, subOptions);
  assertNearArray(a.axis, b.axis, subOptions);
}

function assertNearEuler(
  a: EulerAngles,
  b: EulerAngles,
  options?: AssertNearOptions
) {
  const subOptions = {
    ...(options ?? {}),
    message:
      options?.message ??
      `Expected '${JSON.stringify(a)}' to be close to '${JSON.stringify(b)}'.`,
  };

  assertNear(a.roll, b.roll, subOptions);
  assertNear(a.pitch, b.pitch, subOptions);
  assertNear(a.yaw, b.yaw, subOptions);
}

describe("Quaternions", () => {
  it("create quat and matrix", () => {
    const x90 = quatFromAxisAngle({ axis: [1, 0, 0], angle: Math.PI / 2 });
    assertNearQuat(x90, [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4), 0, 0]);

    assertNearAxisAngle(quatToAxisAngle(x90), {
      angle: Math.PI / 2,
      axis: [1, 0, 0],
    });

    const x90Mat = quatToMatrix(x90);
    assertNearArray(x90Mat, [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
  });
  it("multiply quaternions", () => {
    const x90 = quatFromAxisAngle({ axis: [1, 0, 0], angle: Math.PI / 2 });
    const y90 = quatFromAxisAngle({ axis: [0, 1, 0], angle: Math.PI / 2 });
    const both = quatMul(x90, y90);
    assertNearQuat(both, [0.5, 0.5, 0.5, 0.5]);

    const bothMat = quatToMatrix(both);
    assertNearArray(bothMat, [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
  });
  it("quaternion power", () => {
    const x90 = quatFromAxisAngle({ axis: [1, 0, 0], angle: Math.PI / 2 });
    const y90 = quatFromAxisAngle({ axis: [0, 1, 0], angle: Math.PI / 2 });
    const both = quatMul(x90, y90);
    assertNearQuat(quatMul(both, both), quatPow(both, 2));
  });
  it("convert to axis angle", () => {
    const identityAxisAngle = quatToAxisAngle(quatIdentity);
    assertNear(identityAxisAngle.angle, 0);
    assertNearQuat(quatFromAxisAngle(identityAxisAngle), quatIdentity);

    const x: AxisAngle = { axis: [1, 0, 0], angle: Math.PI / 4 };
    const y: AxisAngle = { axis: [0, 1, 0], angle: Math.PI / 4 };
    const z: AxisAngle = { axis: [0, 0, 1], angle: Math.PI / 4 };
    assertNearAxisAngle(quatToAxisAngle(quatFromAxisAngle(x)), x);
    assertNearAxisAngle(quatToAxisAngle(quatFromAxisAngle(y)), y);
    assertNearAxisAngle(quatToAxisAngle(quatFromAxisAngle(z)), z);
  });
  it("convert to euler", () => {
    const identityAxisAngle = quatToEuler(quatIdentity);
    assertNearEuler(identityAxisAngle, { roll: 0, pitch: 0, yaw: 0 });
    assertNearQuat(quatFromEuler(identityAxisAngle), quatIdentity);

    const x90: EulerAngles = { roll: Math.PI / 2, pitch: 0, yaw: 0 };
    const y90: EulerAngles = { roll: 0, pitch: Math.PI / 2, yaw: 0 };
    const z90: EulerAngles = { roll: 0, pitch: 0, yaw: Math.PI / 2 };
    assertNearEuler(quatToEuler(quatFromEuler(x90)), x90);
    assertNearEuler(quatToEuler(quatFromEuler(y90)), y90);
    assertNearEuler(quatToEuler(quatFromEuler(z90)), z90);

    const x45: EulerAngles = { roll: Math.PI / 4, pitch: 0, yaw: 0 };
    const y45: EulerAngles = { roll: 0, pitch: Math.PI / 4, yaw: 0 };
    const z45: EulerAngles = { roll: 0, pitch: 0, yaw: Math.PI / 4 };
    assertNearEuler(quatToEuler(quatFromEuler(x45)), x45);
    assertNearEuler(quatToEuler(quatFromEuler(y45)), y45);
    assertNearEuler(quatToEuler(quatFromEuler(z45)), z45);

    const xy45: EulerAngles = { roll: Math.PI / 4, pitch: Math.PI / 4, yaw: 0 };
    const xz45: EulerAngles = { roll: Math.PI / 4, pitch: 0, yaw: Math.PI / 4 };
    const yz45: EulerAngles = { roll: 0, pitch: Math.PI / 4, yaw: Math.PI / 4 };
    assertNearEuler(quatToEuler(quatFromEuler(xy45)), xy45);
    assertNearEuler(quatToEuler(quatFromEuler(xz45)), xz45);
    assertNearEuler(quatToEuler(quatFromEuler(yz45)), yz45);

    const xyz45: EulerAngles = {
      roll: Math.PI / 4,
      pitch: Math.PI / 4,
      yaw: Math.PI / 4,
    };
    assertNearEuler(quatToEuler(quatFromEuler(xyz45)), xyz45);
  });
  it("slerp", () => {
    const absDot = (a: Quaternion, b: Quaternion) => Math.abs(quatDot(a, b));

    const x90 = quatFromEuler({ roll: Math.PI / 2, pitch: 0, yaw: 0 });
    const x45 = quatFromEuler({ roll: Math.PI / 4, pitch: 0, yaw: 0 });

    assertNearQuat(quatSlerp(x90, x45, 0), x90);
    assertNearQuat(quatSlerp(x90, x45, 1), x45);

    const x90x45mix = quatSlerp(x90, x45, 0.5);
    // The angular distance between the midpoint and both endpoints should be
    // equal.
    assertNear(absDot(x90x45mix, x90), absDot(x90x45mix, x45));
    // Both endpoints should be nearer to the midpoint than each other.
    assert(absDot(x90, x90x45mix) > absDot(x90, x45));
    assert(absDot(x45, x90x45mix) > absDot(x90, x45));

    assertNearEuler(quatToEuler(x90x45mix), {
      roll: (1.5 * Math.PI) / 4,
      pitch: 0,
      yaw: 0,
    });

    const y90 = quatFromEuler({ roll: 0, pitch: Math.PI / 2, yaw: 0 });

    assertNearQuat(quatSlerp(x90, y90, 0), x90);
    assertNearQuat(quatSlerp(x90, y90, 1), y90);

    const x90y90mix = quatSlerp(x90, y90, 0.5);
    assertNear(absDot(x90y90mix, x90), absDot(x90y90mix, y90));
    assert(absDot(x90, x90y90mix) > absDot(x90, y90));
    assert(absDot(y90, x90y90mix) > absDot(x90, y90));

    // quatSlerp should always take the shortest path so we should get the same
    // results even if we negate one of the quaternions (which would continue
    // to represent the same reotation).
    const x90y90mixNeg = quatSlerp(x90, quatNeg(y90), 0.5);
    assertNear(absDot(x90y90mixNeg, x90), absDot(x90y90mixNeg, y90));
    assert(absDot(x90, x90y90mixNeg) > absDot(x90, y90));
    assert(absDot(y90, x90y90mixNeg) > absDot(x90, y90));

    assertNear(absDot(x90y90mixNeg, x90), absDot(x90y90mixNeg, y90));
  });
});
