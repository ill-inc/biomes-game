import type { Reflect } from "@/shared/asset_defs/shapes";
import { rotatePositionWithinBox } from "@/shared/game/group";
import type { Vec3 } from "@/shared/math/types";
import assert from "assert";

describe("Group Transform", () => {
  it(`rotatePositionWithinBox`, () => {
    const box: Vec3 = [2, 1, 3];
    const reflect: Reflect = [0, 0, 0];
    assert.deepEqual(
      rotatePositionWithinBox([0, 0, 0], 0, reflect, box),
      [0, 0, 0]
    );
    assert.deepEqual(
      rotatePositionWithinBox([0, 0, 0], 1, reflect, box),
      [0, 0, 2]
    );
    assert.deepEqual(
      rotatePositionWithinBox([0, 0, 0], 2, reflect, box),
      [2, 0, 3]
    );
    assert.deepEqual(
      rotatePositionWithinBox([0, 0, 0], 3, reflect, box),
      [3, 0, 0]
    );
  });
});
